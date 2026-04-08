import type { BlocklistModule } from '../types/blocklist';

let blocklistCache: string[] | null = null;

function loadBlocklist(): string[] {
  if (blocklistCache !== null) {
    return blocklistCache;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require('../../assets/blocklist.json') as BlocklistModule;
    if (!Array.isArray(data)) {
      throw new Error('blocklist is not an array');
    }
    blocklistCache = data as string[];
    return blocklistCache;
  } catch {
    throw new Error('フィルターの初期化に失敗しました');
  }
}

/**
 * テキストを正規化する（全角→半角・カタカナ→ひらがな）
 * NFKC 正規化で全角英数・記号を半角に統一したうえで、
 * カタカナをひらがなに変換して照合精度を高める。
 *
 * 冪等性: normalize(normalize(text)) === normalize(text)
 */
export function normalize(text: string): string {
  // NFKC: 全角英数・記号 → 半角、合成文字の分解・再合成
  const nfkc = text.normalize('NFKC');
  // カタカナ（ァ-ヶ）→ ひらがな（ぁ-ゖ）
  return nfkc.replace(/[\u30A1-\u30F6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/**
 * 投稿テキストに禁止用語が含まれているか判定する
 * @returns true = 禁止用語を検出（投稿をブロックすべき）
 * @throws Error - blocklist.json が読み込めない場合
 */
export function checkBlocklist(content: string): boolean {
  const blocklist = loadBlocklist();

  // 辞書が空の場合はすべて通過
  if (blocklist.length === 0) {
    return false;
  }

  const normalizedContent = normalize(content);
  return blocklist.some((word) => normalizedContent.includes(normalize(word)));
}

/** テスト用: キャッシュをリセットする */
export function _resetCache(): void {
  blocklistCache = null;
}
