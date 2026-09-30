import { GOAL_ASPECT_RATIO } from "./physics";
// Dominant opaque pixels sampled from the supplied, unmodified 2462 × 2462 logo.
const originalLogo = require("../../../assets/games/safi/logo-original.png");
export const safiTheme = {
  primary: "#70BC22",
  foreground: "#222224",
  background: "#F5F6F1",
  surface: "#FFFFFF",
  accent: "#70BC22",
  logoLight: originalLogo,
  logoDark: originalLogo,
  arena: "#183329",
  arenaDeep: "#10271F",
  muted: "#70776B",
  line: "#DBE1D4",
  white: "#FFFFFF",
  yolk: "#F4BB35",
  comb: "#CF4A3E",
  featherShade: "#D8DFCE",
  glass: "rgba(255,255,255,0.86)",
} as const;
export const SAFI_CONFIG = {
  id: "safi-penalty",
  rows: 3,
  columns: 5,
  attempts: 10,
  goalAspectRatio: GOAL_ASPECT_RATIO,
} as const;
