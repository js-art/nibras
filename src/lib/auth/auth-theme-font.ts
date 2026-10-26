export function resolvePublicThemeFont(_settings?: {
  publicFontPreset?: string | null;
  activeThemeId?: string | null;
}) {
  return {
    className: "",
    family: "inherit",
    fontFamily: "inherit",
    useLahzeh: false,
  };
}
