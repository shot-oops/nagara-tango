import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

interface CharacterProps {
  size?: number;
}

const NAVY = '#183665';
const NAVY_DARK = '#1d4480';

/** 4-pointed sparkle star. */
function Star({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path
        d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z"
        fill="#f59e0b"
      />
    </G>
  );
}

/** 「さあ、始めよう」用のロケット型キャラクター。 */
export function RocketKun({ size = 160 }: CharacterProps) {
  return (
    <Svg width={size} height={size} viewBox="-60 -80 120 150">
      {/* stars (balanced left/right + top so the rocket stays centered) */}
      <Star x={-42} y={-30} s={1} />
      <Star x={42} y={-30} s={1} />
      <Star x={0} y={-70} s={0.9} />

      {/* flame */}
      <Path d="M -11 32 Q 0 64 11 32 Q 0 42 -11 32 Z" fill="#f97316" />
      <Path d="M -6 33 Q 0 52 6 33 Q 0 40 -6 33 Z" fill="#fbbf24" />

      {/* fins */}
      <Path d="M -16 14 L -31 36 L -16 32 Z" fill={NAVY_DARK} />
      <Path d="M 16 14 L 31 36 L 16 32 Z" fill={NAVY_DARK} />

      {/* body */}
      <Rect x={-16} y={-28} width={32} height={62} rx={9} fill={NAVY} />
      {/* nose cone */}
      <Path d="M -16 -24 Q 0 -62 16 -24 Z" fill={NAVY_DARK} />

      {/* window with face */}
      <Circle cx={0} cy={-4} r={12} fill="#ffffff" />
      <Circle cx={0} cy={-4} r={12} fill="none" stroke={NAVY_DARK} strokeWidth={2.5} />
      <Circle cx={-4} cy={-7} r={2.4} fill={NAVY} />
      <Circle cx={4} cy={-7} r={2.4} fill={NAVY} />
      <Path
        d="M -5 0 Q 0 5 5 0"
        stroke={NAVY}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
