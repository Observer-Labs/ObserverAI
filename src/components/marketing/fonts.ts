import { Geist } from "next/font/google";

/**
 * Marketing typeface: Geist, self-hosted by next/font (the CSP blocks remote
 * font hosts), one variable file for headings and body. Scoped through a CSS
 * variable on the `.mk` wrapper so app screens keep their own type stack.
 * Small labels use the system mono stack, so no second family is shipped.
 */
const sans = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mk-sans-face",
  display: "swap",
});

/** Class that exposes the font variable; put it on the `.mk` root. */
export const marketingFonts = sans.variable;
