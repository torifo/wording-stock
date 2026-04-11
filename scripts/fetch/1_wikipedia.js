/**
 * Wikipedia 日本語版からの表現データ取得スクリプト
 *
 * 戦略:
 *   A) カテゴリ API    → ことわざ・慣用句（記事が直接カテゴリに属している）
 *   B) 一覧ページ方式  → 四字熟語・格言（一覧ページからタイトル/読みを抽出し
 *                        個別記事から意味をバッチ取得）
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
const BATCH_SIZE  = 50;
const RATE_MS     = 1000;

// --- 方式 A: カテゴリ API（ことわざ・慣用句）---
const CATEGORY_TARGETS = [
  { category: 'Category:ことわざ', appCategory: 'ことわざ', maxPages: 400 },
  { category: 'Category:慣用句',   appCategory: '慣用句',   maxPages: 400 },
  { category: 'Category:名言',     appCategory: '名言・格言', maxPages: 200 },
  { category: 'Category:格言',     appCategory: '名言・格言', maxPages: 200 },
];

// --- 方式 B: 著名な四字熟語を直接フェッチ ---
// Wikipedia で Category:四字熟語 は空のため、よく知られた四字熟語の記事タイトルを直接指定
const YOJIJUKUGO_TITLES = [
  '一石二鳥','温故知新','以心伝心','七転八起','一期一会','花鳥風月','自業自得',
  '十人十色','切磋琢磨','精神一到','付和雷同','首尾一貫','臥薪嘗胆','起死回生',
  '四面楚歌','一長一短','一刀両断','天変地異','前途多難','紆余曲折','山紫水明',
  '一笑千金','大器晩成','竜頭蛇尾','呉越同舟','一喜一憂','疑心暗鬼','危機一髪',
  '自由自在','清廉潔白','我田引水','異口同音','弱肉強食','傍若無人','馬耳東風',
  '有言実行','一網打尽','無我夢中','一心不乱','空前絶後','前代未聞','半信半疑',
  '喜怒哀楽','栄枯盛衰','五里霧中','暗中模索','試行錯誤','因果応報','輪廻転生',
  '起承転結','滅私奉公','一致団結','公平無私','百折不撓','千載一遇','鶏口牛後',
  '同床異夢','言語道断','本末転倒','優柔不断','虚心坦懐','意気消沈','意気揚揚',
  '大山鳴動','画竜点睛','電光石火','風林火山','百花繚乱','絶体絶命','岡目八目',
  '針小棒大','牽強付会','枝葉末節','二律背反','率先垂範','是々非々','喜色満面',
  '一日千秋','七転八倒','四苦八苦','以毒制毒','万事休す','独立独歩','明鏡止水',
  '春夏秋冬','東西南北','上下左右','前後不覚','七難八苦','紅一点','大言壮語',
];

// -------------------------------------------------------

async function get(params) {
  const url = `${WIKI_API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res  = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function cleanText(text) {
  return (text || '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'{2,3}/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/<!--.*?-->/gs, '')
    .replace(/<ref[^>]*>.*?<\/ref>/gs, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .trim();
}

// -------------------------------------------------------
// 方式 A: カテゴリ API
// -------------------------------------------------------

async function getCategoryMembers(category, maxPages) {
  const titles = [];
  let cmcontinue;
  while (titles.length < maxPages) {
    const params = {
      action: 'query', list: 'categorymembers',
      cmtitle: category, cmlimit: 500, cmtype: 'page',
      ...(cmcontinue ? { cmcontinue } : {}),
    };
    // デバッグ用: カテゴリが 0 件のとき下記 URL をブラウザで確認
    // console.log(`Debug: ${WIKI_API}?${new URLSearchParams({ format:'json', ...params })}`);
    const data = await get(params);
    titles.push(...(data.query?.categorymembers ?? []).map(m => m.title));
    if (!data.continue?.cmcontinue || titles.length >= maxPages) break;
    cmcontinue = data.continue.cmcontinue;
    await sleep(RATE_MS);
  }
  return titles.slice(0, maxPages);
}

async function fetchExtracts(titles) {
  const data = await get({
    action: 'query', titles: titles.join('|'),
    prop: 'extracts', exintro: true, explaintext: true,
  });
  return Object.values(data.query?.pages ?? {}).map(p => ({
    title: p.title, extract: p.extract ?? '',
  }));
}

function parseEntry(title, extract, appCategory) {
  if (!title || title.length > 30) return null;
  if (/[（(]曖昧さ回避[）)]|一覧$|の節$|ページ$|テンプレート/.test(title)) return null;

  const cleaned = (extract || '').replace(/<[^>]+>/g, '').replace(/\[[^\]]*\]/g, '').trim();
  if (cleaned.length < 5) return null;

  // 読みを抽出（ひらがなのカッコ内）
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const readingMatch =
    cleaned.match(new RegExp(`${esc}\\s*[（(]([ぁ-ん]{1,20})[）)]`)) ||
    cleaned.match(/^[^（(]*[（(]([ぁ-ん]{1,20})[）)]/);
  const reading = readingMatch ? readingMatch[1].split(/[、,]/)[0].trim() : null;

  // 意味を抽出
  const isMatch = cleaned.match(/は[、,]\s*(.{5,150}?[。！？])/);
  const firstSentence = cleaned.match(/^.{5,150}?[。！？]/);
  const meaning = isMatch
    ? isMatch[1].trim()
    : firstSentence
    ? firstSentence[0].trim()
    : cleaned.slice(0, 100).trim() + (cleaned.length > 100 ? '…' : '');

  if (!meaning || meaning.length < 5) return null;

  const content = reading ? `${title}（${reading}）` : title;
  if (content.length > 50) return null;

  return {
    phrase: title, reading, meaning, category: appCategory,
    source: 'Wikipedia 日本語版',
    reference_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    license: 'CC BY-SA 4.0',
    content,
    source_name: 'Wikipedia',
    source_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  };
}

async function runCategoryTarget(target) {
  console.log(`\n[${target.appCategory}] ${target.category} のページ一覧を取得中...`);
  const titles = await getCategoryMembers(target.category, target.maxPages);
  console.log(`  → ${titles.length} ページ`);
  if (titles.length === 0) return [];
  await sleep(RATE_MS);

  const entries = [];
  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const pages  = await fetchExtracts(batch);
    for (const { title, extract } of pages) {
      const entry = parseEntry(title, extract, target.appCategory);
      if (entry) entries.push(entry);
    }
    process.stdout.write(`\r  進捗: ${Math.min(i + BATCH_SIZE, titles.length)}/${titles.length} （有効: ${entries.length}件）`);
    await sleep(RATE_MS);
  }
  console.log('');
  return entries;
}

// -------------------------------------------------------
// 方式 B: 一覧ページからタイトル・読みを抽出 → 個別記事で意味取得
// -------------------------------------------------------

async function fetchWikitext(page) {
  const data = await get({ action: 'parse', page, prop: 'wikitext', formatversion: '2' });
  if (data.error) throw new Error(data.error.info);
  return data.parse.wikitext;
}

/** 一覧ページのウィキテキストから { title, reading } を抽出 */
function extractTitlesFromList(wikitext) {
  const results = [];
  const seen = new Set();
  for (const line of wikitext.split('\n')) {
    const text = cleanText(line.replace(/^\*+/, ''));
    // パターン: TERM（reading）
    const m = text.match(/^([^\s（(【「]{1,20})[（(]([ぁ-ん]{1,20})[）)]/);
    if (m) {
      const title = m[1].trim();
      const reading = m[2].trim();
      if (!seen.has(title)) {
        seen.add(title);
        results.push({ title, reading });
      }
    }
  }
  return results;
}

async function runListPageTarget(target) {
  console.log(`\n[${target.appCategory}] 一覧ページ「${target.page}」からタイトルを抽出中...`);
  const wikitext = await fetchWikitext(target.page);
  const items    = extractTitlesFromList(wikitext);
  console.log(`  → ${items.length} タイトル抽出`);
  if (items.length === 0) return [];
  await sleep(RATE_MS);

  const entries = [];
  const titles  = items.map(i => i.title);
  const readingMap = Object.fromEntries(items.map(i => [i.title, i.reading]));

  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const pages  = await fetchExtracts(batch);
    for (const { title, extract } of pages) {
      const cleaned = (extract || '').replace(/<[^>]+>/g, '').replace(/\[[^\]]*\]/g, '').trim();
      if (cleaned.length < 5) continue;

      // 読みは一覧ページから取得済み、意味は個別記事から抽出
      const reading = readingMap[title] || null;
      const isMatch = cleaned.match(/は[、,]\s*(.{5,150}?[。！？])/);
      const firstSentence = cleaned.match(/^.{5,150}?[。！？]/);
      const meaning = isMatch
        ? isMatch[1].trim()
        : firstSentence
        ? firstSentence[0].trim()
        : cleaned.slice(0, 100).trim() + (cleaned.length > 100 ? '…' : '');

      if (!meaning || meaning.length < 5) continue;

      const content = reading ? `${title}（${reading}）` : title;
      if (content.length > 50) continue;

      entries.push({
        phrase: title, reading, meaning, category: target.appCategory,
        source: 'Wikipedia 日本語版',
        reference_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        license: 'CC BY-SA 4.0',
        content,
        source_name: 'Wikipedia',
        source_url: `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      });
    }
    process.stdout.write(`\r  進捗: ${Math.min(i + BATCH_SIZE, titles.length)}/${titles.length} （有効: ${entries.length}件）`);
    await sleep(RATE_MS);
  }
  console.log('');
  return entries;
}

// -------------------------------------------------------
// メイン
// -------------------------------------------------------

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const allEntries = [];

  // 方式 A
  for (const target of CATEGORY_TARGETS) {
    try {
      const entries = await runCategoryTarget(target);
      allEntries.push(...entries);
    } catch (err) {
      console.error(`  エラー: ${err.message}`);
    }
  }

  // 方式 B: 四字熟語タイトル直接フェッチ
  console.log(`\n[四字熟語] ${YOJIJUKUGO_TITLES.length}件を直接フェッチ中...`);
  {
    const entries = [];
    for (let i = 0; i < YOJIJUKUGO_TITLES.length; i += BATCH_SIZE) {
      const batch = YOJIJUKUGO_TITLES.slice(i, i + BATCH_SIZE);
      const pages  = await fetchExtracts(batch);
      for (const { title, extract } of pages) {
        const entry = parseEntry(title, extract, '四字熟語');
        if (entry) entries.push(entry);
      }
      process.stdout.write(`\r  進捗: ${Math.min(i + BATCH_SIZE, YOJIJUKUGO_TITLES.length)}/${YOJIJUKUGO_TITLES.length} （有効: ${entries.length}件）`);
      await sleep(RATE_MS);
    }
    console.log('');
    allEntries.push(...entries);
  }

  const output = {
    metadata: {
      source: 'Wikipedia 日本語版',
      fetched_at: new Date().toISOString(),
      license: 'CC BY-SA 4.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
      attribution: '原著作者: ウィキペディア日本語版寄稿者',
      count: allEntries.length,
    },
    entries: allEntries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n完了: ${allEntries.length} 件 → ${OUTPUT_FILE}`);
}

main().catch(console.error);
