/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const brand = '#FF7A18'; // vivid orange
const brandDark = '#FF7A18';

export const Colors = {
  light: {
    text: '#0F172A', // slate-900
    background: '#F8FAFC', // slate-50
    tint: brand,
    icon: '#64748B', // slate-500
    tabIconDefault: '#94A3B8', // slate-400
    tabIconSelected: brand,
    card: '#FFFFFF',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    accent: brand, // added
  },
  dark: {
    background: '#0D1117',       // slightly lighter background
    card: '#111827',             // clearer contrast for cards
    text: '#F1F5F9',             // brighter white text
    tint: brandDark,             // add missing tint property
    icon: '#94A3B8',             // add missing icon property
    tabIconDefault: '#64748B',   // add missing tabIconDefault property
    tabIconSelected: brandDark,  // add missing tabIconSelected property
    accent: brandDark,           // blue accent
    danger: '#EF4444',           // red
    info: '#60A5FA',             // cyan
    success: '#10B981',          // green
    muted: '#94A3B8',            // for secondary text
    border: '#1F2937',           // added
    warning: '#FBBF24',          // add back warning for contrast in charts/badges
  },


};

// Tableau/D3-like categorical palette for charts
export const ChartPalette = {
  light: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#22C55E', '#06B6D4', '#A855F7'],
  dark: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#2DD4BF', '#FB923C', '#4ADE80', '#22D3EE', '#C084FC'],
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
