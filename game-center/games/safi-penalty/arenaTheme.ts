import type { SafiPresentation } from "../../safiService";
export const ARENA_THEMES: Record<SafiPresentation["arena"], { sky: string; turf: string; light: string; accent: string; label: string }> = {
  classic: { sky: "#12251D", turf: "#355E32", light: "#D3E9B4", accent: "#70BC22", label: "SAFI CLASSIC" },
  night: { sky: "#0B1026", turf: "#253B4C", light: "#A4CDF3", accent: "#70BC22", label: "NIGHT STADIUM" },
  summer: { sky: "#234533", turf: "#557D38", light: "#FFE2A6", accent: "#D8C670", label: "SUMMER ARENA" },
  new_year: { sky: "#112C38", turf: "#314D48", light: "#D5EBEF", accent: "#B8D7CE", label: "NEW YEAR" },
  ramadan: { sky: "#161D38", turf: "#355549", light: "#EAD8A1", accent: "#D3BE85", label: "RAMADAN" },
  campaign: { sky: "#192522", turf: "#365D31", light: "#D8E7BD", accent: "#70BC22", label: "SAFI CAMPAIGN" },
};
