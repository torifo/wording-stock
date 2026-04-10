/**
 * GitHub 公開データセットからの表現データ取得スクリプト（改良版）
 *
 * 対応ソース:
 *   - CSV / TSV / JSON 形式のファイルを URL 指定で取得
 *   - scripts/data/manual/ に手動配置したファイルも自動取り込み
 *
 * URL の追加方法:
 *   DATASETS 配列に { name, url, type, category, license, transform } を追加する
 *   URL は raw.githubusercontent.com のブランチ名（master/main）を要確認
 *
 * 手動ファイルの追加方法:
 *   scripts/data/manual/*.json または *.csv を配置すると自動で読み込まれる
 *   JSON フォーマット: { entries: [{ phrase, reading, meaning, category, source, reference_url }] }
 *
 * 出力: scripts/data/raw/github.json
 * 実行: node scripts/fetch/2_github.js
 */

const fs   = require('fs');
const path = require('path');

const OUTPUT_DIR   = path.join(__dirname, '..', 'data', 'raw');
const MANUAL_DIR   = path.join(__dirname, '..', 'data', 'manual');
const OUTPUT_FILE  = path.join(OUTPUT_DIR, 'github.json');
const UA           = 'WordingStock/1.0 (educational; https://github.com/torifo/wording-stock)';

/**
 * 取得対象データセット
 *
 * ▼ 追加するときの注意
 *   - ブラウザで URL に直接アクセスして 200 が返ることを確認してから追加
 *   - ライセンスを必ず確認すること（CC0 / MIT / Apache 2.0 が望ましい）
 *   - transform 関数で統一フォーマットに変換する
 */
const DATASETS = [
  // ① ことわざ・四字熟語混合（配列形式: [phrase, reading, 説明文]）
  {
    name: 'barkdoll/kotowaza-bot',
    url:  'https://raw.githubusercontent.com/barkdoll/kotowaza-bot/master/kotowaza.json',
    type: 'json',
    category: 'ことわざ',  // 4文字なら自動で四字熟語に変更
    license: 'MIT',
    transform: (item) => {
      // データ形式: ["表現", "よみ", "説明文\n\n意味"]
      if (!Array.isArray(item)) return { phrase: null, reading: null, meaning: null, source: null, reference_url: null };
      const phrase  = item[0] || null;
      const reading = item[1] || null;
      const raw     = (item[2] || '');
      // 「\n\n」以降が意味。「⇒他の言葉」だけの場合はスキップ
      const parts   = raw.split('\n\n');
      const tail    = parts.slice(1).join(' ').trim();
      const meaning = tail && !tail.startsWith('⇒') && !tail.startsWith('→')
        ? tail.replace(/[（(][ぁ-ん]+[）)]/g, '').trim()
        : null;
      return {
        phrase,
        reading,
        meaning,
        source:        'barkdoll/kotowaza-bot (GitHub)',
        reference_url: 'https://github.com/barkdoll/kotowaza-bot',
      };
    },
  },

  // 追加したい場合はここにオブジェクトを追加
  // ブラウザで Raw URL にアクセスして 200 が返ることを確認してから追加すること
];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function parseCSV(text, sep = ',') {
  const lines   = text.trim().split('\n');
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = line.split(sep).map(v => v.replace(/^"|"$/g, '').trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
}

function buildEntry(transformed, category, license) {
  const { phrase, reading, meaning, source, reference_url } = transformed;
  if (!phrase || phrase.length > 50) return null;

  // 4文字の漢字表現は四字熟語として分類
  const purePhrase = phrase.replace(/[（(][^）)]*[）)]/g, '').trim();
  const detectedCategory = (category === 'ことわざ' && [...purePhrase].length === 4)
    ? '四字熟語'
    : category;

  const content = reading ? `${phrase}（${reading}）` : phrase;
  return {
    phrase,
    reading:       reading || null,
    meaning:       meaning || null,
    category:      detectedCategory,
    source:        source || '不明',
    reference_url: reference_url || null,
    license,
    // seed-expressions.js 用
    content,
    source_name:  source || 'GitHub',
    source_url:   reference_url || null,
  };
}

async function processDataset(ds) {
  const text = await fetchText(ds.url);
  let items;

  if (ds.type === 'json') {
    const parsed = JSON.parse(text);
    items = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed).find(Array.isArray) ?? [];
  } else {
    items = parseCSV(text, ds.type === 'tsv' ? '\t' : ',');
  }

  return items
    .map(item => buildEntry(ds.transform(item), ds.category, ds.license))
    .filter(Boolean);
}

/** scripts/data/manual/ の手動配置ファイルを読み込む */
function loadManualFiles() {
  const entries = [];
  if (!fs.existsSync(MANUAL_DIR)) return entries;

  const files = fs.readdirSync(MANUAL_DIR).filter(f => /\.(json|csv)$/.test(f));
  for (const file of files) {
    try {
      const text = fs.readFileSync(path.join(MANUAL_DIR, file), 'utf-8');
      if (file.endsWith('.json')) {
        const data = JSON.parse(text);
        const items = data.entries ?? (Array.isArray(data) ? data : []);
        for (const item of items) {
          if (!item.phrase && !item.content) continue;
          entries.push({
            phrase:        item.phrase || item.content,
            reading:       item.reading || null,
            meaning:       item.meaning || null,
            category:      item.category || 'その他',
            source:        item.source || `手動追加: ${file}`,
            reference_url: item.reference_url || null,
            license:       item.license || '不明',
            content:       item.content || (item.reading ? `${item.phrase}（${item.reading}）` : item.phrase),
            source_name:   item.source || `手動: ${file}`,
            source_url:    item.reference_url || null,
          });
        }
        console.log(`  [手動] ${file}: ${items.length} 件`);
      }
    } catch (err) {
      console.error(`  [手動] ${file} 読み込みエラー: ${err.message}`);
    }
  }
  return entries;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR,  { recursive: true });
  fs.mkdirSync(MANUAL_DIR, { recursive: true });

  const allEntries = [];

  // GitHub URL からの取得
  for (const ds of DATASETS) {
    process.stdout.write(`[GitHub] ${ds.name} ... `);
    try {
      const entries = await processDataset(ds);
      console.log(`${entries.length} 件`);
      allEntries.push(...entries);
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`スキップ (${err.message})`);
    }
  }

  if (DATASETS.length === 0) {
    console.log('[GitHub] 設定済みデータセットなし。DATASETS 配列に URL を追加してください。');
  }

  // 手動ファイルの取り込み
  const manualEntries = loadManualFiles();
  allEntries.push(...manualEntries);

  const output = {
    metadata: {
      source:     'GitHub オープンデータセット + 手動追加',
      fetched_at: new Date().toISOString(),
      count:      allEntries.length,
      note:       '各エントリの license フィールドを参照してください',
    },
    entries: allEntries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n完了: ${allEntries.length} 件 → ${OUTPUT_FILE}`);
  console.log(`手動ファイル追加先: ${MANUAL_DIR}`);
}

main().catch(console.error);
