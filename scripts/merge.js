/**
 * 各ソースの raw JSON をマージ・重複除去するスクリプト
 *
 * 入力:  scripts/data/raw/*.json
 * 出力:  scripts/data/merged.json
 *
 * 重複判定: content を正規化（全角スペース除去・改行除去）した文字列で比較
 * 優先度:  Wikipedia > GitHub > その他（先に見つかったものを採用）
 *
 * 実行: node scripts/merge.js
 */

const fs = require('fs');
const path = require('path');

const RAW_DIR    = path.join(__dirname, 'data', 'raw');
const OUTPUT_FILE = path.join(__dirname, 'data', 'merged.json');

/** 重複比較用に content を正規化 */
function normalizeKey(content) {
  return content
    .replace(/\n.*/s, '')      // 1行目（表現本体）のみ使用
    .replace(/（[^）]+）/, '') // よみがな除去
    .replace(/[\s　]/g, '')    // 空白除去
    .toLowerCase();
}

/** ソースの信頼度スコア（高いほど優先） */
const SOURCE_PRIORITY = {
  'Wikipedia': 100,
  'GitHub オープンデータセット': 80,
};

function getSourcePriority(entry) {
  return SOURCE_PRIORITY[entry.source_name] ?? 50;
}

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`raw ディレクトリが見つかりません: ${RAW_DIR}`);
    console.error('先に fetch スクリプトを実行してください:');
    console.error('  node scripts/fetch/1_wikipedia.js');
    console.error('  node scripts/fetch/2_github.js');
    process.exit(1);
  }

  // raw/*.json を全て読み込む
  const rawFiles = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.json'));
  if (rawFiles.length === 0) {
    console.error('raw ディレクトリに JSON ファイルがありません。');
    process.exit(1);
  }

  console.log(`読み込むファイル: ${rawFiles.join(', ')}`);

  const allEntries = [];
  for (const file of rawFiles) {
    const filePath = path.join(RAW_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const entries = data.entries || [];
    console.log(`  ${file}: ${entries.length} 件`);
    allEntries.push(...entries);
  }

  console.log(`\n合計: ${allEntries.length} 件（重複除去前）`);

  // カテゴリ別に分けて処理
  const byCategory = {};
  for (const entry of allEntries) {
    const cat = entry.category || 'その他';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(entry);
  }

  // 重複除去（カテゴリ内で）
  const merged = [];
  for (const [category, entries] of Object.entries(byCategory)) {
    // 信頼度の高いソースを優先するためソート
    const sorted = [...entries].sort((a, b) => getSourcePriority(b) - getSourcePriority(a));

    const seen = new Map(); // key → entry
    for (const entry of sorted) {
      const key = normalizeKey(entry.content);
      if (!key) continue;
      if (!seen.has(key)) {
        seen.set(key, entry);
      } else {
        // より信頼度が高いソースがあればそちらを優先（ソート済みなので通常は初出が優先）
        const existing = seen.get(key);
        if (getSourcePriority(entry) > getSourcePriority(existing)) {
          seen.set(key, entry);
        }
      }
    }

    const unique = Array.from(seen.values());
    console.log(`  ${category}: ${entries.length} → ${unique.length} 件（${entries.length - unique.length} 件重複除去）`);
    merged.push(...unique);
  }

  console.log(`\n重複除去後: ${merged.length} 件`);

  // カテゴリ別集計
  const stats = {};
  for (const entry of merged) {
    stats[entry.category] = (stats[entry.category] || 0) + 1;
  }
  console.log('\nカテゴリ別件数:');
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count} 件`);
  }

  const output = {
    metadata: {
      merged_at: new Date().toISOString(),
      total_count: merged.length,
      stats,
      sources: rawFiles,
    },
    entries: merged,
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n出力: ${OUTPUT_FILE}`);
}

main();
