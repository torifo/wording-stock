/**
 * GitHub 公開データセットからの表現データ取得スクリプト
 *
 * 取得対象（すべて CC0 / Public Domain / MIT ライセンス）:
 *   - japanese-proverbs-data (ことわざ CSV)
 *   - yojijukugo-data (四字熟語 JSON)
 *
 * 設定: DATASETS 配列に URL を追加することで取得先を増やせる
 *
 * 実行: node scripts/fetch/2_github.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'github.json');
const USER_AGENT = 'WordingStock/1.0 (educational; https://github.com/torifo/wording-stock)';

/**
 * 取得対象データセット設定
 * type: 'json' | 'csv' | 'tsv'
 * format: データ内のフィールドマッピング
 */
const DATASETS = [
  // --- 四字熟語 ---
  {
    name: 'yojijukugo (GitHub: jnory/yojijukugo)',
    url: 'https://raw.githubusercontent.com/jnory/yojijukugo/master/yojijukugo.json',
    type: 'json',
    category: '四字熟語',
    license: 'MIT',
    // JSON 形式: [{ "word": "一石二鳥", "yomi": "いっせきにちょう", "meaning": "..." }]
    transform: (item) => ({
      term: item.word || item.term || item.kanji || null,
      reading: item.yomi || item.reading || item.kana || null,
      meaning: item.meaning || item.definition || item.description || null,
    }),
  },

  // --- ことわざ ---
  // 有効な URL が見つかった場合はここに追加してください
  // {
  //   name: 'japanese-proverbs (GitHub: xxx/xxx)',
  //   url: 'https://raw.githubusercontent.com/xxx/xxx/main/proverbs.json',
  //   type: 'json',
  //   category: 'ことわざ',
  //   license: 'CC0',
  //   transform: (item) => ({
  //     term: item.proverb,
  //     reading: item.reading || null,
  //     meaning: item.meaning,
  //   }),
  // },
];

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchCSV(url, separator = ',') {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
  });
}

function buildContent(term, reading, meaning) {
  if (!term) return null;
  let content = term;
  if (reading) content += `（${reading}）`;
  if (meaning) content += `\n${meaning}`;
  return content.length <= 280 ? content : null;
}

async function processDataset(dataset) {
  const entries = [];
  let rawData;

  if (dataset.type === 'json') {
    rawData = await fetchJSON(dataset.url);
  } else if (dataset.type === 'csv') {
    rawData = await fetchCSV(dataset.url, ',');
  } else if (dataset.type === 'tsv') {
    rawData = await fetchCSV(dataset.url, '\t');
  } else {
    throw new Error(`Unknown type: ${dataset.type}`);
  }

  // 配列でない場合（例: { data: [...] }）は内部の配列を探す
  const items = Array.isArray(rawData)
    ? rawData
    : Object.values(rawData).find(Array.isArray) || [];

  for (const item of items) {
    const { term, reading, meaning } = dataset.transform(item);
    const content = buildContent(term, reading, meaning);
    if (!content) continue;

    entries.push({
      content,
      term: term || null,
      reading: reading || null,
      meaning: meaning || null,
      category: dataset.category,
      source_name: dataset.name,
      source_url: dataset.url,
      license: dataset.license,
      license_url: null,
    });
  }

  return entries;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const allEntries = [];

  for (const dataset of DATASETS) {
    process.stdout.write(`[GitHub] ${dataset.name} を取得中... `);
    try {
      const entries = await processDataset(dataset);
      console.log(`${entries.length} 件`);
      allEntries.push(...entries);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`スキップ (${err.message})`);
    }
  }

  const output = {
    metadata: {
      source: 'GitHub オープンデータセット',
      fetched_at: new Date().toISOString(),
      count: allEntries.length,
      note: '各エントリの license フィールドを参照してください',
    },
    entries: allEntries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n完了: ${allEntries.length} 件 → ${OUTPUT_FILE}`);
  if (allEntries.length === 0) {
    console.log('ヒント: DATASETS 配列に有効なデータセット URL を追加してください。');
  }
}

main().catch(console.error);
