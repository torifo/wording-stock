# Wording-Stock トラブルシューティング記録

初期セットアップ〜SDK 54 移行までに発生した問題と解決策の記録。

---

## 1. npm install ピア依存関係コンフリクト

**エラー:**
```
npm error ERESOLVE could not resolve
react-test-renderer@19 と react@18 の不整合
```

**原因:** `jest-expo` が `react-test-renderer@19` を要求するが、当時の React は 18.x だった。

**解決策:** `devDependencies` に `"react-test-renderer": "18.2.0"` をピン留め。

---

## 2. @tamagui/expo-router-plugin が 404

**エラー:**
```
npm error 404 Not Found - @tamagui/expo-router-plugin
```

**原因:** パッケージ名が間違い（存在しない）。

**解決策:** `package.json` から `@tamagui/expo-router-plugin` を削除。

---

## 3. @tamagui/babel-plugin ESM/CJS コンフリクト

**エラー:**
```
SyntaxError: Unexpected token '{'
```

**原因:** `@tamagui/babel-plugin` が CJS の `require()` で ESM 形式の Tamagui 設定ファイル (`tamagui.config.ts`) を読もうとして失敗。

**解決策:** `babel.config.js` から `@tamagui/babel-plugin` を完全に除去（最適化専用のため開発中は不要）。

---

## 4. モバイル「Something went wrong」— NavigationGuard パターン

**エラー:** Expo Go で QR 読み込み後に「Something went wrong」

**原因:** `(tabs)/_layout.tsx` 内の `NavigationGuard` コンポーネントが `useSegments` / `useRouter` を `<Stack>` ナビゲーターの外側で呼び出していた。Expo Router の制約違反。

**解決策:** `<Redirect>` コンポーネントを使うパターンに変更。レイアウトは常にナビゲーターを返す。

```tsx
// NG: NavigationGuard で useRouter().replace() を呼ぶ
// OK: <Redirect href="/auth/login" /> を返す
```

---

## 5. Web「window is not defined」SSR クラッシュ

**エラー:**
```
ReferenceError: window is not defined
```

**原因:** `app.json` の `"output": "static"` が SSR（Node.js 環境）でレンダリングを試みるが、`AsyncStorage` が `window.localStorage` を参照しているため Node.js でクラッシュ。

**解決策:** `app.json` の web 設定を変更。

```json
"web": { "bundler": "metro", "output": "single" }
```

---

## 6. アセット PNG の CRC エラー

**エラー:**
```
Error: Crc error - 1036536041 - 1036536047
  at jimp-compact ...
```

**原因:** プレースホルダー PNG を `base64` の文字列から作成したが、CRC チェックサムが不正だった。`jimp` がアイコン処理時にクラッシュ。

**解決策:** Node.js の `zlib.deflateSync` + 正確な CRC32 アルゴリズムで PNG バイナリを再生成。

```js
const zlib = require('zlib');
function crc32(buf) { /* ... */ }
function chunk(type, data) { /* type + data + CRC32 */ }
const png = Buffer.concat([signature, chunk('IHDR', ...), chunk('IDAT', ...), chunk('IEND', ...)]);
```

---

## 7. Expo SDK 51 → SDK 54 アップグレード

**症状:** Expo Go（SDK 54）がプロジェクト（SDK 51）と不一致で接続拒否。

**解決手順:**

```bash
npx expo install expo@^54.0.0 --check
npm install --legacy-peer-deps react@19.1.0 react-native@0.81.5 expo-router@~6.0.23 ...
npm install --save-dev @types/react@~19.1.10 typescript@~5.9.2
```

> `--legacy-peer-deps` が必要な理由: React 19 と古い expo-router(3.x) が同時に解決されようとしてコンフリクトするため。

---

## 8. react-native-reanimated v4 — worklets babel plugin エラー

**エラー:**
```
Error: [BABEL]: Cannot find module 'react-native-worklets/plugin'
```

**原因の連鎖:**
1. SDK 54 の推奨バージョンは `react-native-reanimated@~4.1.1`
2. reanimated v4 の babel plugin が `react-native-worklets/plugin` を内部で `require()` する
3. Metro の jest-worker subprocess がこのモジュールを解決できない
4. `react-native-worklets` はネイティブコード（android/ apple/）を持ち、Expo Go に含まれていない

**解決策:**

- `babel.config.js` から `react-native-reanimated/plugin` を**完全に除去**
- `GreyLayer.tsx` で使っていた reanimated の `useSharedValue` / `useAnimatedStyle` を RN 標準の `Animated.timing()` に書き換え

```js
// babel.config.js — 最終形
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

```tsx
// GreyLayer.tsx — RN 標準 Animated を使用
import { Animated } from 'react-native';
const opacity = useRef(new Animated.Value(0.3)).current;
Animated.timing(opacity, { toValue: 1.0, duration: 300, useNativeDriver: true }).start();
```

> **補足:** expo-router 自体は reanimated を使うが、node_modules 内のコードは pre-compiled のため babel plugin 不要。

---

## 9. Windows Firewall がポート 8081 をブロック

**症状:** Expo Go で QR を読み込むと接続できない（"Go back to expo home"）。Web は `localhost` で正常動作。

**原因:** Windows Defender ファイアウォールがローカルネットワークからの TCP 8081 への受信をブロック。

**解決策:** 管理者 PowerShell で受信規則を追加:

```powershell
New-NetFirewallRule -DisplayName "Expo Metro 8081" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
```

または Windows セキュリティ GUI:
> ファイアウォールと詳細設定 → 受信の規則 → 新しい規則 → ポート → TCP → 8081 → 許可

---

## 10. ポート 8081 が占有されたまま起動できない

**症状:** 前回の `expo start` を Ctrl+C で終了した後、再起動時に「Port 8081 is already in use」

**解決策:** `package.json` に `prestart` フックを追加して自動解放:

```json
"scripts": {
  "start": "expo start",
  "prestart": "kill-port 8081 || true"
}
```

起動コマンド: `npm start -- --clear`

---

## 環境情報（解決後の最終構成）

| 項目 | バージョン |
|---|---|
| Expo SDK | 54 (54.0.33) |
| expo-router | 6.0.23 |
| React | 19.1.0 |
| React Native | 0.81.5 |
| Tamagui | 1.109.8 |
| Expo Go (Android) | 54.0.6 |
| 開発OS | Windows 11 |
