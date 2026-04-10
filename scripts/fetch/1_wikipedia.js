/**
 * Wikipedia 日本語版からの表現データ取得スクリプト
 *
 * 取得対象ページ:
 *   - 四字熟語の一覧
 *   - 日本のことわざ一覧
 *   - 慣用句の一覧
 *   - 格言
 *
 * 出力: scripts/data/raw/wikipedia.json
 *
 * ライセンス: Wikipedia コンテンツは CC BY-SA 4.0
 *   https://creativecommons.org/licenses/by-sa/4.0/deed.ja
 *
 * 実行: node scripts/fetch/1_wikipedia.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'wikipedia.json');
const WIKI_API = 'https://ja.wikipedia.org/w/api.php';
const USER_AGENT = 'WordingStock/1.0 (educational data collection; https://github.com/torifo/wording-stock)';

/** 取得するページとカテゴリのマッピング */
const TARGET_PAGES = [
  { page: '四字熟語の一覧',      category: '四字熟語' },
  { page: '日本のことわざ一覧',  category: 'ことわざ' },
  { page: '慣用句の一覧',        category: '慣用句'  },
  { page: '格言',                category: '名言・格言' },
];

/** Wikipedia API からウィキテキストを取得 */
async function fetchWikitext(page) {
  const params = new URLSearchParams({
    action: 'parse',
    page,
    prop: 'wikitext',
    formatversion: '2',
    format: 'json',
  });
  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.info);
  return data.parse.wikitext;
}

/** ウィキテキストの装飾記法を除去してプレーンテキストに変換 */
function cleanText(text) {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[link|表示]] → 表示
    .replace(/\[\[([^\]]+)\]\]/g, '$1')             // [[link]] → link
    .replace(/'{2,3}/g, '')                          // '''bold''' ''italic''
    .replace(/\{\{[^}]*\}\}/g, '')                   // {{テンプレート}}
    .replace(/<!--.*?-->/gs, '')                     // コメント
    .replace(/<ref[^>]*>.*?<\/ref>/gs, '')           // <ref>注釈</ref>
    .replace(/<[^>]+>/g, '')                         // HTMLタグ
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * ウィキテキストをパースしてエントリ一覧を返す
 *
 * 対応フォーマット:
 *   A) 定義リスト形式
 *      ; 石の上にも三年（いしのうえにもさんねん）
 *      : 辛抱強く続ければ成果が出るということ
 *
 *   B) 箇条書き＋よみがな形式
 *      * [[一石二鳥]]（いっせきにちょう）一つの行動で二つの利益を得ること
 *
 *   C) 箇条書き＋ダッシュ形式
 *      * [[石橋を叩いて渡る]] - 慎重すぎること
 */
function parseWikitext(wikitext, category, sourceUrl) {
  const entries = [];
  const lines = wikitext.split('\n');

  let pendingTerm = null;
  let pendingReading = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // --- 定義リスト: 見出し行 "; TERM（reading）" ---
    if (line.startsWith(';')) {
      const text = cleanText(line.slice(1).trim());
      const m = text.match(/^(.+?)（([^）]+)）/);
      if (m) {
        pendingTerm = m[1].trim();
        pendingReading = m[2].trim();
      } else {
        pendingTerm = text.replace(/（[^）]*）/, '').trim() || null;
        pendingReading = null;
      }
      continue;
    }

    // --- 定義リスト: 説明行 ": MEANING" ---
    if (line.startsWith(':') && pendingTerm) {
      const meaning = cleanText(line.slice(1).trim());
      if (meaning.length > 0) {
        const content = pendingReading
          ? `${pendingTerm}（${pendingReading}）\n${meaning}`
          : `${pendingTerm}\n${meaning}`;
        if (isValidEntry(content)) {
          entries.push(makeEntry(content, pendingTerm, pendingReading, meaning, category, sourceUrl));
        }
      }
      pendingTerm = null;
      pendingReading = null;
      continue;
    }

    // 定義リストが続かなかった場合はリセット
    if (!line.startsWith(':')) {
      pendingTerm = null;
      pendingReading = null;
    }

    // --- 箇条書き（1段階のみ） ---
    if (line.startsWith('*') && !line.startsWith('**')) {
      const text = cleanText(line.replace(/^\*+/, '').trim());
      if (!text || text.length < 2) continue;

      // パターン B: TERM（reading）meaning
      const withReading = text.match(/^(.{1,20})（([^）]{1,20})）\s*(.{0,200})$/);
      if (withReading) {
        const term = withReading[1].trim();
        const reading = withReading[2].trim();
        const meaning = withReading[3].trim();
        const content = meaning ? `${term}（${reading}）\n${meaning}` : `${term}（${reading}）`;
        if (isValidEntry(content)) {
          entries.push(makeEntry(content, term, reading, meaning || null, category, sourceUrl));
        }
        continue;
      }

      // パターン C: TERM - meaning
      const withDash = text.match(/^(.{1,20})\s*[－\-ー]\s+(.{2,200})$/);
      if (withDash) {
        const term = withDash[1].trim();
        const meaning = withDash[2].trim();
        const content = `${term}\n${meaning}`;
        if (isValidEntry(content)) {
          entries.push(makeEntry(content, term, null, meaning, category, sourceUrl));
        }
      }
    }
  }

  return entries;
}

/** content が DB に投稿するのに適切かチェック */
function isValidEntry(content) {
  if (!content || content.length < 2 || content.length > 280) return false;
  // 節見出し・テンプレート残骸を除外
  if (/^[={}|]/.test(content)) return false;
  // カテゴリや画像リンクを除外
  if (/^(Category|ファイル|File|Image):/.test(content)) return false;
  return true;
}

/** エントリオブジェクトを生成 */
function makeEntry(content, term, reading, meaning, category, sourceUrl) {
  return {
    content,
    term,
    reading: reading || null,
    meaning: meaning || null,
    category,
    source_name: 'Wikipedia',
    source_url: sourceUrl,
    license: 'CC BY-SA 4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allEntries = [];

  for (const { page, category } of TARGET_PAGES) {
    process.stdout.write(`[Wikipedia] ${page} を取得中... `);
    try {
      const wikitext = await fetchWikitext(page);
      const sourceUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(page)}`;
      const entries = parseWikitext(wikitext, category, sourceUrl);
      console.log(`${entries.length} 件`);
      allEntries.push(...entries);
    } catch (err) {
      console.log(`スキップ (${err.message})`);
    }
    // Wikipedia のレート制限を尊重
    await new Promise(r => setTimeout(r, 1500));
  }

  const output = {
    metadata: {
      source: 'Wikipedia 日本語版',
      fetched_at: new Date().toISOString(),
      license: 'CC BY-SA 4.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
      attribution: 'この作品はウィキペディア日本語版のコンテンツを利用しています。原著作者: ウィキペディア日本語版寄稿者',
      count: allEntries.length,
    },
    entries: allEntries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n完了: ${allEntries.length} 件 → ${OUTPUT_FILE}`);
}

main().catch(console.error);
