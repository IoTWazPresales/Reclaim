import React from 'react';
import { Path, type PathProps } from 'react-native-svg';

import { isValidPathD, logInvalidPathD } from '@/lib/svg/path';

type SafeSvgPathProps = PathProps & {
  d: string;
  /** __DEV__ log tag when `d` is rejected */
  source?: string;
};

/** Renders nothing when `d` would crash horcrux PathParser on Android. */
export function SafeSvgPath({ d, source = 'unknown', ...rest }: SafeSvgPathProps) {
  if (!isValidPathD(d)) {
    logInvalidPathD(d, source);
    return null;
  }
  return <Path d={d} {...rest} />;
}
