import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

interface CharacterProps {
  size?: number;
}

const NAVY = '#183665';
const SKIN = '#fde3c0';

/** 「ワンタップで記録」用のスマホ型キャラクター。 */
export function PhoneKun({ size = 160 }: CharacterProps) {
  return (
    <Svg width={size} height={size} viewBox="-50 -65 120 130">
      {/* eyebrows */}
      <Path d="M -16 -48 Q -10 -52 -4 -48" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d="M 4 -48 Q 10 -52 16 -48" stroke={NAVY} strokeWidth={2.5} strokeLinecap="round" fill="none" />

      {/* eyes peeking over the top edge */}
      <Circle cx={-10} cy={-42} r={7} fill="#ffffff" />
      <Circle cx={10} cy={-42} r={7} fill="#ffffff" />
      <Circle cx={-9} cy={-41} r={3.2} fill={NAVY} />
      <Circle cx={11} cy={-41} r={3.2} fill={NAVY} />
      <Circle cx={-10} cy={-43} r={1.2} fill="#ffffff" />
      <Circle cx={10} cy={-43} r={1.2} fill="#ffffff" />

      {/* phone body */}
      <Rect x={-26} y={-38} width={52} height={80} rx={10} fill={NAVY} />
      {/* screen */}
      <Rect x={-19} y={-30} width={38} height={46} rx={5} fill="#e8eef6" />

      {/* green check on the screen */}
      <Path
        d="M -10 -8 L -3 1 L 12 -16"
        stroke="#10B981"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* smile under the screen */}
      <Path
        d="M -7 27 Q 0 33 7 27"
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* tapping hand (right) */}
      <Ellipse cx={44} cy={24} rx={13} ry={10} fill={SKIN} />
      <Rect x={12} y={14} width={32} height={9} rx={4.5} fill={SKIN} />
    </Svg>
  );
}
