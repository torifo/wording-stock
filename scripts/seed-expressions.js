/**
 * マージ済み表現データを Supabase DB に一括インサートするスクリプト
 *
 * 前提:
 *   - node scripts/merge.js を先に実行して scripts/data/merged.json を生成する
 *   - Supabase ダッシュボードで system@wording-stock.internal の
 *     ユーザーを "Add user" から作成しておく（自動作成も可）
 *
 * 実行: node scripts/seed-expressions.js
 *
 * オプション:
 *   DRY_RUN=1 node scripts/seed-expressions.js  ← DB には書かず件数だけ確認
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // サービスロールキー
const MERGED_FILE      = path.join(__dirname, 'data', 'merged.json');
const SYSTEM_EMAIL     = 'system@wording-stock.internal';
const SYSTEM_PASSWORD  = process.env.SYSTEM_BOT_PASSWORD || 'system-bot-pwd-2026!';
const BATCH_SIZE       = 100; // 1回にインサートする件数
const DRY_RUN          = process.env.DRY_RUN === '1';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: .env.local に以下を設定してください:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...  (Supabase ダッシュボード → Settings → API → service_role)');
  process.exit(1);
}

// サービスロールキーを使用（RLS をバイパスするため）
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** システムユーザーを取得または作成する */
async function getOrCreateSystemUser() {
  // profiles テーブルからシステムユーザーを探す
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', 'system_bot')
    .maybeSingle();

  if (existing) {
    console.log(`システムユーザー既存: ${existing.id}`);
    return existing.id;
  }

  // auth.users を検索（admin API 使用）
  const { data: userList } = await supabase.auth.admin.listUsers();
  const systemUser = userList?.users?.find(u => u.email === SYSTEM_EMAIL);

  let userId;
  if (systemUser) {
    userId = systemUser.id;
    console.log(`システムユーザー（auth）既存: ${userId}`);
  } else {
    // 新規作成
    const { data, error } = await supabase.auth.admin.createUser({
      email: SYSTEM_EMAIL,
      password: SYSTEM_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`システムユーザー作成失敗: ${error.message}`);
    userId = data.user.id;
    console.log(`システムユーザー作成: ${userId}`);
  }

  // profiles を更新してユーザー名を system_bot に変更
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ username: 'system_bot' })
    .eq('id', userId);

  if (profileError) {
    console.warn(`profiles 更新失敗（無視可）: ${profileError.message}`);
  }

  return userId;
}

/** 配列を指定サイズのチャンクに分割 */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  if (!fs.existsSync(MERGED_FILE)) {
    console.error(`merged.json が見つかりません: ${MERGED_FILE}`);
    console.error('先に以下を実行してください:');
    console.error('  node scripts/fetch/1_wikipedia.js');
    console.error('  node scripts/fetch/2_github.js');
    console.error('  node scripts/merge.js');
    process.exit(1);
  }

  const { entries, metadata } = JSON.parse(fs.readFileSync(MERGED_FILE, 'utf-8'));
  console.log(`merged.json: ${entries.length} 件（${metadata.merged_at}）`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] DB には書き込みません。');
    const stats = {};
    for (const e of entries) stats[e.category] = (stats[e.category] || 0) + 1;
    console.log('カテゴリ別:', stats);
    return;
  }

  // システムユーザーを取得/作成
  console.log('\nシステムユーザーを確認中...');
  const systemUserId = await getOrCreateSystemUser();

  // 既存シードデータのチェック（重複インサート防止）
  const { count: existingCount } = await supabase
    .from('expressions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', systemUserId);

  if (existingCount && existingCount > 0) {
    console.log(`\n既存シードデータ: ${existingCount} 件`);
    const answer = await new Promise(resolve => {
      process.stdout.write('上書き（追加）しますか？ [y/N] ');
      process.stdin.once('data', d => resolve(d.toString().trim().toLowerCase()));
    });
    if (answer !== 'y') {
      console.log('キャンセルしました。');
      process.exit(0);
    }
  }

  // インサート
  const rows = entries.map(e => ({
    user_id:      systemUserId,
    content:      e.content,
    category:     e.category,
    censor_status: 'safe',
    is_ai_checked: true,
    visibility:   true,
    source_name:  e.source_name || null,
    source_url:   e.source_url  || null,
  }));

  const chunks = chunkArray(rows, BATCH_SIZE);
  let inserted = 0;
  let errors   = 0;

  console.log(`\nインサート開始: ${rows.length} 件（${chunks.length} バッチ）\n`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const { error } = await supabase.from('expressions').insert(chunk);
    if (error) {
      console.error(`  バッチ ${i + 1} エラー: ${error.message}`);
      errors += chunk.length;
    } else {
      inserted += chunk.length;
      process.stdout.write(`\r  進捗: ${inserted}/${rows.length} 件`);
    }
  }

  console.log(`\n\n完了: ${inserted} 件インサート、${errors} 件エラー`);
}

main().catch(console.error);
