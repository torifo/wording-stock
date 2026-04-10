/**
 * Wikipedia 日本語版からの表現データ取得スクリプト（改良版）
 *
 * 戦略:
 *   1. Wikipedia カテゴリ API でページタイトル一覧を取得
 *   2. 50件ずつバッチで extracts（冒頭段落）を取得
 *   3. 冒頭段落から意味・読みを抽出
 *
 * ライセンス: CC BY-SA 4.0
 *   https://creativecommons.org/licenses/by-sa/4.0/deed.ja
 *
 * 出力: scripts/data/raw/wikipedia.json
 * 実行: node scripts/fetch/1_wikipedia.js
 */

const fs   = require('fs');
const path = require('path');

const OUTPUT_DIR  = path.join(__dirname, '..', 'data', 'raw');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'wikipedia.json');
const WIKI_API    = 'https://ja.wikipedia.org/w/api.php';
const UA          = 'WordingStock/1.0 (educational; https://github.com/torifo/wording-stock)';
const BATCH_SIZE  = 50;   // Wikipedia API の上限
const RATE_MS     = 1000; // リクエスト間隔（ms）

/** 取得対象カテゴリ */
const TARGETS = [
  { category: 'Category:四字熟語',         appCategory: '四字熟語',   maxPages: 600 },
  { category: 'Category:日本語のことわざ',  appCategory: 'ことわざ',   maxPages: 400 },
  { category: 'Category:日本語の慣用句',    appCategory: '慣用句',     maxPages: 400 },
  { category: 'Category:格言',             appCategory: '名言・格言', maxPages: 200 },
];

async function get(params) {
  const url = `${WIKI_API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res  = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/** カテゴリに属するページタイトル一覧を取得（最大 maxPages 件） */
async function getCategoryMembers(category, maxPages) {
  const titles = [];
  let cmcontinue = undefined;

  while (titles.length < maxPages) {
    const params = {
      action:  'query',
      list:    'categorymembers',
      cmtitle: category,
      cmlimit: 500,
      cmtype:  'page',
      ...(cmcontinue ? { cmcontinue } : {}),
    };
    const data = await get(params);
    const members = data.query?.categorymembers ?? [];
    titles.push(...members.map(m => m.title));

    if (!data.continue?.cmcontinue || titles.length >= maxPages) break;
    cmcontinue = data.continue.cmcontinue;
    await sleep(RATE_MS);
  }

  return titles.slice(0, maxPages);
}

/** 複数タイトルの冒頭段落を一括取得 */
async function fetchExtracts(titles) {
  const data = await get({
    action:       'query',
    titles:       titles.join('|'),
    prop:         'extracts|revisions',
    exintro:      true,
    explaintext:  true,
    rvprop:       'content',
    rvslots:      'main',
    rvsection:    0,
  });

  const pages = Object.values(data.query?.pages ?? {});
  return pages.map(p => ({
    title:   p.title,
    extract: p.extract ?? '',
  }));
}

/** HTML タグ・注釈を除去してプレーンテキストに */
function cleanExtract(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * タイトルとエキストラクトからエントリを生成
 *
 * 読みの抽出:  タイトル直後の（...）を reading とみなす
 * 意味の抽出:  冒頭段落の最初の文を meaning とする
 */
function parseEntry(title, extract, appCategory, sourceUrl) {
  if (!title || title.length > 30) return null;

  // 曖昧さ回避ページ・一覧ページを除外
  if (/\(曖昧さ回避\)|一覧|の節|ページ/.test(title)) return null;
  if (!extract || extract.length < 5) return null;

  const cleaned = cleanExtract(extract);

  // 読みを抽出（「タイトル（よみ）」パターン）
  const readingMatch = cleaned.match(new RegExp(
    `${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[（(]([^）)]{1,20})[）)]`
  ));
  const reading = readingMatch ? readingMatch[1] : null;

  // 意味を抽出（最初の文）
  const firstSentenceMatch = cleaned.match(/([^。！？\n]{10,150}[。！？])/);
  const meaning = firstSentenceMatch ? firstSentenceMatch[1].trim() : null;

  if (!meaning) return null;

  // content は言葉のみ（読みはあれば付加）
  const content = reading ? `${title}（${reading}）` : title;
  if (content.length > 50) return null;

  return {
    phrase:        title,
    reading:       reading,
    meaning:       meaning,
    category:      appCategory,
    source:        'Wikipedia 日本語版',
    reference_url: sourceUrl,
    license:       'CC BY-SA 4.0',
    // seed-expressions.js が使う統一フィールド
    content,
    source_name:  'Wikipedia',
    source_url:   `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allEntries = [];

  for (const target of TARGETS) {
    console.log(`\n[${target.appCategory}] ${target.category} のページ一覧を取得中...`);
    let titles;
    try {
      titles = await getCategoryMembers(target.category, target.maxPages);
      console.log(`  → ${titles.length} ページ`);
    } catch (err) {
      console.error(`  カテゴリ取得失敗: ${err.message}`);
      continue;
    }
    await sleep(RATE_MS);

    // BATCH_SIZE 件ずつ extracts を取得
    let fetched = 0;
    for (let i = 0; i < titles.length; i += BATCH_SIZE) {
      const batch = titles.slice(i, i + BATCH_SIZE);
      try {
        const pages = await fetchExtracts(batch);
        for (const { title, extract } of pages) {
          const sourceUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`;
          const entry = parseEntry(title, extract, target.appCategory, sourceUrl);
          if (entry) {
            allEntries.push(entry);
            fetched++;
          }
        }
        process.stdout.write(`\r  進捗: ${Math.min(i + BATCH_SIZE, titles.length)}/${titles.length} ページ処理済み（有効: ${fetched}件）`);
      } catch (err) {
        process.stdout.write(`\r  バッチエラー (${err.message})`);
      }
      await sleep(RATE_MS);
    }
    console.log('');
  }

  const output = {
    metadata: {
      source:      'Wikipedia 日本語版',
      fetched_at:  new Date().toISOString(),
      license:     'CC BY-SA 4.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
      attribution: '原著作者: ウィキペディア日本語版寄稿者',
      count:       allEntries.length,
    },
    entries: allEntries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n完了: ${allEntries.length} 件 → ${OUTPUT_FILE}`);
}

main().catch(console.error);
