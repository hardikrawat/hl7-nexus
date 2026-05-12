export const DEFAULT_THEME_ID = 'soft-slate';
export const LIGHT_THEME_ID = 'soft-slate';
export const DARK_THEME_ID = 'dark-console';

export const NEXUS_THEMES = [
  {
    id: 'soft-slate',
    name: 'Light',
    summary: 'Soft Slate',
    swatches: ['#eef2f7', '#f8fafc', '#b4232a', '#0f172a'],
  },
  {
    id: 'dark-console',
    name: 'Dark',
    summary: 'A dark operations console with warm red highlights.',
    swatches: ['#09090b', '#18181b', '#f87171', '#f8fafc'],
  },
];

export const getThemeById = (themeId) => (
  NEXUS_THEMES.find((theme) => theme.id === themeId)
  || NEXUS_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)
  || NEXUS_THEMES[0]
);

export const getNextThemeId = (themeId) => (
  themeId === DARK_THEME_ID ? LIGHT_THEME_ID : DARK_THEME_ID
);
