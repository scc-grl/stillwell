/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "brand": {
      "fill": "#e6eee7",
      "ring": "#b7c9bd",
      "core": "#537566",
      "dot": "#bd705c"
    },
    "light": {
      "background": "#f5f4ed",
      "foreground": "#253b34",
      "border": "#dfe5db",
      "card": "#fbfaf5",
      "cardForeground": "#29463b",
      "popover": "#fbfaf5",
      "popoverForeground": "#29463b",
      "primary": "#315b49",
      "primaryForeground": "#fbfaf4",
      "secondary": "#edf2ea",
      "secondaryForeground": "#526c5c",
      "muted": "#edf2ea",
      "mutedForeground": "#626d62",
      "accent": "#dfc7b4",
      "accentForeground": "#29463b",
      "destructive": "#ba4e3b",
      "destructiveForeground": "#ffffff",
      "input": "#d8e1d6",
      "ring": "#568166",
      "chart1": "#315b49",
      "chart2": "#c5997d",
      "chart3": "#a5b79e",
      "chart4": "#c9bba6",
      "chart5": "#697268",
      "sidebar": "#f5f4ed",
      "sidebarForeground": "#29463b",
      "sidebarBorder": "#dfe5db",
      "sidebarPrimary": "#315b49",
      "sidebarPrimaryForeground": "#fbfaf4",
      "sidebarAccent": "#edf2ea",
      "sidebarAccentForeground": "#526c5c",
      "sidebarRing": "#568166"
    },
    "dark": {
      "background": "#1b2822",
      "foreground": "#f2f0e9",
      "border": "#41534a",
      "card": "#24332c",
      "cardForeground": "#f2f0e9",
      "popover": "#24332c",
      "popoverForeground": "#f2f0e9",
      "primary": "#88b49a",
      "primaryForeground": "#1b2822",
      "secondary": "#35463d",
      "secondaryForeground": "#f2f0e9",
      "muted": "#35463d",
      "mutedForeground": "#a8b8ad",
      "accent": "#856247",
      "accentForeground": "#f2f0e9",
      "destructive": "#ba4e3b",
      "destructiveForeground": "#ffffff",
      "input": "#41534a",
      "ring": "#85ad96",
      "chart1": "#88b49a",
      "chart2": "#c59c7d",
      "chart3": "#a0b899",
      "chart4": "#c9bea6",
      "chart5": "#a9b7ad",
      "sidebar": "#1b2822",
      "sidebarForeground": "#f2f0e9",
      "sidebarBorder": "#41534a",
      "sidebarPrimary": "#88b49a",
      "sidebarPrimaryForeground": "#1b2822",
      "sidebarAccent": "#35463d",
      "sidebarAccentForeground": "#f2f0e9",
      "sidebarRing": "#85ad96"
    }
  },
  "fontFamily": {
    "sans": [
      "DM Sans",
      "sans-serif"
    ],
    "serif": [
      "Fraunces",
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "1rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
