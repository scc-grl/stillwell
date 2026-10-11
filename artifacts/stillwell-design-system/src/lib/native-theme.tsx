import { tokens } from "../generated/tokens";

const pixelsPerRem = 16;

export const nativeTheme = {
  colors: {
    light: tokens.color.light,
    dark: tokens.color.dark,
  },
  radius: Number.parseFloat(tokens.radius) * pixelsPerRem,
  spacing: Number.parseFloat(tokens.spacing) * pixelsPerRem,
  fonts: {
    body: "StillwellSans",
    bodyMedium: "StillwellSansMedium",
    bodySemibold: "StillwellSansSemibold",
    bodyBold: "StillwellSansBold",
    display: "StillwellDisplay",
  },
  typography: {
    display: { fontSize: 36, lineHeight: 44 },
    heading: { fontSize: 24, lineHeight: 32 },
    body: { fontSize: 16, lineHeight: 24 },
    label: { fontSize: 14, lineHeight: 20 },
    caption: { fontSize: 12, lineHeight: 18 },
  },
} as const;

export type NativeThemeColors = typeof tokens.color.light;
