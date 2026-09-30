import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Line,
} from "react-native-svg";
import { safiTheme as t } from "../config";
import { arenaLayout } from "../physics";

/** Original vector goalkeeper. Gloves frame the projectile at the shared catch anchor. */
export function Chicken({ caught = false }: { caught?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 180">
      <Defs>
        <LinearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.white} />
          <Stop offset="1" stopColor={t.featherShade} />
        </LinearGradient>
        <LinearGradient id={`${id}jersey`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor={t.primary} />
          <Stop offset="1" stopColor={t.arena} />
        </LinearGradient>
      </Defs>
      <Ellipse
        cx="81"
        cy="168"
        rx="40"
        ry="7"
        fill={t.arenaDeep}
        opacity=".22"
      />
      <Path
        d="M62 140L58 160M99 139L104 160"
        stroke={t.yolk}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <Path
        d="M58 160L40 165M58 160L67 167M104 160L122 164M104 160L96 168"
        stroke={t.yolk}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <Path d="M109 96Q146 65 139 104Q149 108 122 129Z" fill={t.featherShade} />
      <Path
        d="M48 70Q25 98 43 134Q56 153 85 149Q120 148 126 122Q134 87 104 65Z"
        fill={`url(#${id}body)`}
      />
      <Path
        d="M43 103Q80 118 123 101L122 130Q111 151 82 149Q54 149 42 131Z"
        fill={`url(#${id}jersey)`}
      />
      <Path
        d="M70 112L82 124L96 112"
        fill="none"
        stroke={t.white}
        strokeWidth="3"
        opacity=".9"
      />
      <Path
        d="M78 128V140M88 128V140"
        stroke={t.white}
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".7"
      />
      <Path
        d="M59 40Q48 22 62 20Q62 5 74 13Q83 -1 92 13Q112 11 103 36"
        fill={t.comb}
      />
      <Path
        d="M56 42Q77 23 99 40Q114 53 109 77Q109 95 88 102Q58 99 52 78Q46 59 56 42Z"
        fill={`url(#${id}body)`}
      />
      <Path
        d="M65 44L100 45"
        stroke={t.primary}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <Ellipse cx="69" cy="61" rx="5" ry={caught ? 3 : 6} fill={t.foreground} />
      <Ellipse cx="94" cy="60" rx="5" ry={caught ? 3 : 6} fill={t.foreground} />
      <Circle cx="70" cy="59" r="1.5" fill={t.white} />
      <Circle cx="95" cy="58" r="1.5" fill={t.white} />
      <Path d="M75 84Q80 101 88 84" fill={t.comb} />
      <Path d="M70 74L82 66L97 74L83 86Z" fill={t.yolk} />
      <Path
        d="M71 74L95 74"
        stroke={t.foreground}
        strokeWidth="1.5"
        opacity=".45"
      />
      <Path
        d="M45 83Q24 81 19 99Q22 117 48 105L61 96"
        fill={`url(#${id}body)`}
      />
      <Path
        d="M115 84Q137 79 142 96Q141 113 113 105L98 96"
        fill={`url(#${id}body)`}
      />
      <Path
        d="M49 88Q56 79 64 86L70 99Q65 111 54 105L45 100Z"
        fill={t.primary}
        stroke={t.arena}
        strokeWidth="2"
      />
      <Path
        d="M103 85Q112 80 119 89L122 100L109 107Q100 108 96 99Z"
        fill={t.primary}
        stroke={t.arena}
        strokeWidth="2"
      />
      <Path
        d="M54 88L60 100M111 88L107 100"
        stroke={t.white}
        strokeWidth="2"
        opacity=".8"
      />
    </Svg>
  );
}
export function Egg() {
  const id = useId().replace(/:/g, "");
  return (
    <Svg width="100%" height="100%" viewBox="0 0 48 60">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2=".8">
          <Stop stopColor={t.white} />
          <Stop offset=".6" stopColor="#F7F5EF" />
          <Stop offset="1" stopColor="#C9CFBF" />
        </LinearGradient>
      </Defs>
      <Path
        d="M24 3C14 3 5 24 5 38C5 63 43 63 43 38C43 24 34 3 24 3Z"
        fill={`url(#${id})`}
        stroke={t.white}
        strokeWidth="1.5"
      />
      <Ellipse
        cx="17"
        cy="23"
        rx="4"
        ry="9"
        fill={t.white}
        opacity=".85"
        rotation="20"
        origin="17,23"
      />
    </Svg>
  );
}
export function EggSplat() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 110 95">
      <Path
        d="M50 29C32 8 36 31 23 24C4 13 20 36 11 45C-2 59 24 56 30 66C34 88 44 65 56 72C72 93 68 68 84 72C103 80 91 59 103 52C118 38 88 39 85 26C82 7 71 32 62 26Z"
        fill={t.white}
        opacity=".94"
      />
      <Ellipse cx="55" cy="47" rx="23" ry="17" fill={t.yolk} />
      <Ellipse cx="48" cy="42" rx="9" ry="4" fill={t.white} opacity=".4" />
      <Path
        d="M14 16L26 12L20 24ZM91 13L100 19L87 24ZM27 79L19 90L15 80ZM91 76L104 82L98 91Z"
        fill={t.white}
      />
      <Circle cx="7" cy="69" r="3" fill={t.white} />
      <Circle cx="82" cy="7" r="3" fill={t.yolk} />
    </Svg>
  );
}
export function Gift({ index }: { index: number }) {
  return (
    <Svg width="72" height="76" viewBox="0 0 72 76">
      <Path
        d="M34 25C5 25 19 1 30 14L36 26C67 27 55 0 44 14L36 26"
        fill="none"
        stroke={t.primary}
        strokeWidth="4"
      />
      <Rect x="9" y="29" width="54" height="40" rx="8" fill={t.foreground} />
      <Rect x="5" y="25" width="62" height="13" rx="4" fill={t.arena} />
      <Rect x="31" y="25" width="10" height="44" fill={t.primary} />
      <Circle cx={24 + index * 12} cy="74" r="1.5" fill={t.primary} />
    </Svg>
  );
}
export function Field({ width }: { width: number }) {
  const {
    height: h,
    goal: { x: gx, y: gy, width: gw, height: gh },
  } = arenaLayout(width);
  const id = useId().replace(/:/g, "");
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop stopColor={t.arenaDeep} />
          <Stop offset="1" stopColor={t.arena} />
        </LinearGradient>
      </Defs>
      <Rect width={width} height={h} rx="28" fill={`url(#${id})`} />
      <Path
        d={`M0 ${h * 0.62}L${width} ${h * 0.62}L${width} ${h}H0Z`}
        fill={t.primary}
        opacity=".17"
      />
      <Path
        d={`M${gx} ${gy + gh}L0 ${h * 0.87}M${gx + gw} ${gy + gh}L${width} ${h * 0.87}`}
        stroke={t.white}
        opacity=".15"
      />
      <Ellipse
        cx={width * 0.5}
        cy={h * 0.98}
        rx={width * 0.34}
        ry={width * 0.18}
        fill="none"
        stroke={t.white}
        strokeWidth="1.5"
        opacity=".16"
      />
      <Path
        d={`M${width * 0.28} ${h * 0.63}L${width * 0.19} ${h * 0.75}L${width * 0.81} ${h * 0.75}L${width * 0.72} ${h * 0.63}`}
        fill="none"
        stroke={t.white}
        opacity=".13"
      />
      <Rect
        x={gx}
        y={gy}
        width={gw}
        height={gh}
        fill={t.arenaDeep}
        opacity=".65"
      />
      {Array.from({ length: 21 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={gx + (gw * i) / 20}
          x2={gx + (gw * i) / 20}
          y1={gy}
          y2={gy + gh}
          stroke={t.white}
          strokeWidth=".65"
          opacity=".11"
        />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={gx}
          x2={gx + gw}
          y1={gy + (gh * i) / 10}
          y2={gy + (gh * i) / 10}
          stroke={t.white}
          strokeWidth=".65"
          opacity=".11"
        />
      ))}
      <Path
        d={`M${gx - 3} ${gy + gh + 3}V${gy - 3}H${gx + gw + 3}V${gy + gh + 3}`}
        fill="none"
        stroke={t.arenaDeep}
        strokeWidth="10"
        strokeLinecap="round"
      />
      <Path
        d={`M${gx} ${gy + gh}V${gy}H${gx + gw}V${gy + gh}`}
        fill="none"
        stroke={t.white}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <Line
        x1={gx}
        x2={gx + gw}
        y1={gy + gh}
        y2={gy + gh}
        stroke={t.white}
        strokeWidth="2"
        opacity=".45"
      />
      <G opacity=".65">
        <Rect
          x={width * 0.08}
          y={width * 0.07}
          width={width * 0.21}
          height="3"
          rx="1.5"
          fill={t.primary}
        />
        <Rect
          x={width * 0.71}
          y={width * 0.07}
          width={width * 0.21}
          height="3"
          rx="1.5"
          fill={t.primary}
        />
      </G>
      <Ellipse
        cx={width * 0.5}
        cy={h * 0.92}
        rx={width * 0.07}
        ry="4"
        fill={t.arenaDeep}
        opacity=".7"
      />
      <Circle
        cx={width * 0.5}
        cy={h * 0.93}
        r="2"
        fill={t.white}
        opacity=".5"
      />
    </Svg>
  );
}
