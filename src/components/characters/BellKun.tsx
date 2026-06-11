import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

interface CharacterProps {
  size?: number;
}

const NAVY = '#183665';

/** 「通知を見るだけ」用のベル型キャラクター。 */
export function BellKun({ size = 160 }: CharacterProps) {
  return (
    <Svg width={size} height={size} viewBox="-50 -60 100 110">
      {/* top knob */}
      <Rect x={-2.5} y={-44} width={5} height={12} rx={2} fill={NAVY} />
      <Circle cx={0} cy={-44} r={5} fill={NAVY} />

      {/* bell dome */}
      <Path d="M -27 22 C -27 -8 -16 -34 0 -34 C 16 -34 27 -8 27 22 Z" fill={NAVY} />
      {/* rim */}
      <Rect x={-31} y={19} width={62} height={9} rx={4.5} fill={NAVY} />
      {/* clapper */}
      <Circle cx={0} cy={33} r={4.5} fill={NAVY} />

      {/* cheeks */}
      <Ellipse cx={-15} cy={5} rx={4.5} ry={3} fill="#e06060" opacity={0.5} />
      <Ellipse cx={15} cy={5} rx={4.5} ry={3} fill="#e06060" opacity={0.5} />

      {/* eyes */}
      <Circle cx={-9} cy={-5} r={6} fill="#ffffff" />
      <Circle cx={9} cy={-5} r={6} fill="#ffffff" />
      <Circle cx={-8} cy={-4} r={3} fill="#111111" />
      <Circle cx={10} cy={-4} r={3} fill="#111111" />
      <Circle cx={-9} cy={-6} r={1.3} fill="#ffffff" />
      <Circle cx={9} cy={-6} r={1.3} fill="#ffffff" />

      {/* smile */}
      <Path
        d="M -7 7 Q 0 14 7 7"
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* notification badge */}
      <Circle cx={26} cy={-30} r={11} fill="#EF4444" />
      <SvgText
        x={26}
        y={-25}
        fontSize={15}
        fontWeight="bold"
        fill="#ffffff"
        textAnchor="middle"
      >
        !
      </SvgText>
    </Svg>
  );
}
