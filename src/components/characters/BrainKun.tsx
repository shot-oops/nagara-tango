import React from 'react';
import Svg, { Circle, Ellipse, Path, Text as SvgText } from 'react-native-svg';

interface CharacterProps {
  size?: number;
}

const LEFT = '#183665';
const RIGHT = '#1d4480';

/** 「忘れた頃に届く」用の脳型キャラクター。 */
export function BrainKun({ size = 160 }: CharacterProps) {
  return (
    <Svg width={size} height={size} viewBox="-50 -50 100 90">
      {/* left hemisphere */}
      <Path
        d="M 0 -30 C -11 -35 -23 -32 -29 -22 C -35 -13 -35 1 -29 9 C -23 19 -11 21 0 18 Z"
        fill={LEFT}
      />
      {/* right hemisphere */}
      <Path
        d="M 0 -30 C 11 -35 23 -32 29 -22 C 35 -13 35 1 29 9 C 23 19 11 21 0 18 Z"
        fill={RIGHT}
      />
      {/* center crease */}
      <Path d="M 0 -29 L 0 17" stroke="#0f2347" strokeWidth={2} strokeLinecap="round" fill="none" />

      {/* wrinkles (left) */}
      <Path d="M -23 -18 Q -15 -14 -22 -7" stroke="#0f2347" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M -14 -24 Q -7 -18 -13 -10" stroke="#2a5090" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M -24 -2 Q -16 2 -22 9" stroke="#0f2347" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* wrinkles (right) */}
      <Path d="M 23 -18 Q 15 -14 22 -7" stroke="#2a5090" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M 14 -24 Q 7 -18 13 -10" stroke="#0f2347" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M 24 -2 Q 16 2 22 9" stroke="#2a5090" strokeWidth={2} fill="none" strokeLinecap="round" />

      {/* cheeks */}
      <Ellipse cx={-17} cy={9} rx={4.5} ry={3} fill="#e06060" opacity={0.4} />
      <Ellipse cx={17} cy={9} rx={4.5} ry={3} fill="#e06060" opacity={0.4} />

      {/* eyes */}
      <Circle cx={-9} cy={2} r={5.5} fill="#ffffff" />
      <Circle cx={9} cy={2} r={5.5} fill="#ffffff" />
      <Circle cx={-8} cy={3} r={2.8} fill="#0f2347" />
      <Circle cx={10} cy={3} r={2.8} fill="#0f2347" />
      <Circle cx={-9} cy={1} r={1.2} fill="#ffffff" />
      <Circle cx={9} cy={1} r={1.2} fill="#ffffff" />

      {/* smile */}
      <Path
        d="M -6 11 Q 0 16 6 11"
        stroke="#ffffff"
        strokeWidth={2.3}
        strokeLinecap="round"
        fill="none"
      />

      {/* Zzz */}
      <SvgText
        x={30}
        y={-30}
        fontSize={13}
        fontWeight="bold"
        fontStyle="italic"
        fill={LEFT}
        opacity={0.7}
        textAnchor="middle"
      >
        Zzz
      </SvgText>
    </Svg>
  );
}
