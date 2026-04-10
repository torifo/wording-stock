import { config } from '@tamagui/config/v3';
import { createTamagui } from 'tamagui';

/**
 * 紅色（くれない）スケール — 日本国旗の紅色 #BC002D をベースに生成
 *
 * #9  = 紅色オフィシャル (Hinomaru)
 * #1  = 最も淡い / #12 = 最も濃い
 */
const kurenai = {
  kurenai1:  '#FFF5F7',
  kurenai2:  '#FFE8EE',
  kurenai3:  '#FFCFDB',
  kurenai4:  '#FFB0C4',
  kurenai5:  '#FF8FAD',
  kurenai6:  '#F5607E',
  kurenai7:  '#DC2D59',
  kurenai8:  '#C41A42',
  kurenai9:  '#BC002D',  // 日の丸 公式紅色
  kurenai10: '#A00028',
  kurenai11: '#7A001E',
  kurenai12: '#530014',
};

// ライトテーマ: blue スケールを紅色で置き換え、背景を和紙白に
const lightTheme = {
  ...config.themes.light,
  // 背景: 純白より少しだけ温かみのある和紙白
  background: '#FFFAF9',
  backgroundHover: 'rgba(255,250,249,0.75)',
  backgroundPress: '#FFF0F0',
  backgroundFocus: '#FFF5F5',
  // ボーダー
  borderColor: '#F0E0E3',
  borderColorHover: '#F5E8EA',
  // アクセント
  accentBackground: kurenai.kurenai9,
  accentColor: '#FFFFFF',
  // blue スケール → 紅色スケールに置き換え
  // ($blue10 をリンク色等で使っているため)
  blue1:  kurenai.kurenai1,
  blue2:  kurenai.kurenai2,
  blue3:  kurenai.kurenai3,
  blue4:  kurenai.kurenai4,
  blue5:  kurenai.kurenai5,
  blue6:  kurenai.kurenai6,
  blue7:  kurenai.kurenai7,
  blue8:  kurenai.kurenai8,
  blue9:  kurenai.kurenai9,
  blue10: kurenai.kurenai10,
  blue11: kurenai.kurenai11,
  blue12: kurenai.kurenai12,
};

// ダークテーマ: 深い墨色背景 + 紅色アクセント
const darkTheme = {
  ...config.themes.dark,
  background: '#1A0A0C',
  backgroundHover: '#261014',
  backgroundPress: '#2E1218',
  backgroundFocus: '#2E1218',
  borderColor: '#3D1A20',
  borderColorHover: '#4A2028',
  accentBackground: kurenai.kurenai9,
  accentColor: '#FFFFFF',
  blue1:  '#2E0B12',
  blue2:  '#3D1018',
  blue3:  '#521520',
  blue4:  '#6B1A28',
  blue5:  '#8A2035',
  blue6:  '#A82842',
  blue7:  '#C43055',
  blue8:  '#D83D65',
  blue9:  kurenai.kurenai9,
  blue10: '#D44070',
  blue11: '#F07090',
  blue12: '#FFB8CC',
};

export const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: lightTheme,
    dark:  darkTheme,
  },
  tokens: {
    ...config.tokens,
    color: {
      ...config.tokens.color,
      ...kurenai,
    },
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
