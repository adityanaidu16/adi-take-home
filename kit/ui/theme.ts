import { createLightTheme, type BrandVariants, type Theme } from "@fluentui/react-components";

/**
 * The layout deliberately matches a model-driven Power App so nobody has to
 * relearn where things are. The palette and type do not: this is our product,
 * not a Microsoft one.
 */
const teal: BrandVariants = {
  10: "#020505",
  20: "#0D1A1B",
  30: "#122B2D",
  40: "#14383B",
  50: "#15464A",
  60: "#15545A",
  70: "#12636A",
  80: "#0C727B",
  90: "#00818C",
  100: "#2A8E97",
  110: "#469AA3",
  120: "#5FA7AF",
  130: "#78B4BA",
  140: "#91C1C6",
  150: "#AACED2",
  160: "#C4DBDE",
};

// `--font-kit-sans` is defined by next/font in app/layout.tsx.
const fontFamily =
  'var(--font-kit-sans), "Public Sans", ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const base = createLightTheme(teal);

export const kitTheme: Theme = {
  ...base,
  fontFamilyBase: fontFamily,
  fontFamilyNumeric: `var(--font-kit-sans), ui-monospace, "SF Mono", Menlo, monospace`,
  // Squarer than Fluent's default, and a warmer paper than Microsoft's greys.
  borderRadiusMedium: "3px",
  borderRadiusLarge: "4px",
  colorNeutralBackground2: "#F6F5F1",
  colorNeutralBackground3: "#EFEDE7",
  colorNeutralStroke2: "#DFDCD3",
};

/** The suite bar, which sits outside the neutral ramp. */
export const chrome = {
  bar: "#14383B",
  barText: "#F2F6F5",
  barTextMuted: "rgba(242,246,245,0.72)",
  barHover: "rgba(255,255,255,0.10)",
  barActive: "rgba(255,255,255,0.18)",
  accent: "#00818C",
};
