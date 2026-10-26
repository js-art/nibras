export type SiteSettings = {
  publicFontPreset?: string | null;
  activeThemeId?: string | null;
};

export function useSiteSettings() {
  return {
    data: {
      publicFontPreset: null,
      activeThemeId: null,
    } as SiteSettings,
    isLoading: false,
  };
}
