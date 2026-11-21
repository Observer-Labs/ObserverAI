import { Bricolage_Grotesque } from "next/font/google";

/**
 * Marketing-only display typeface, self-hosted by next/font (the CSP blocks
 * remote font hosts). Scoped through a CSS variable on the `.mk` wrapper so
 * app screens keep their own type stack.
 *
 * Body copy and the small mono labels deliberately stay on system fonts: the
 * largest text block paints with the first frame, and the page ships a single
 * webfont family.
 */
const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  // One static weight: headings are always extrabold, and the file is about half the variable font.
  weight: "800",
  variable: "--font-mk-display-face",
  display: "swap",
});

/** Class that exposes the display font variable; put it on the `.mk` root. */
export const marketingFonts = display.variable;
