/**
 * Production-safe Design Lab loader.
 * Metro DCE drops the require() when `__DEV__` is false, so the lab module
 * does not ship in release bundles. Route registration must also be `__DEV__`.
 */
import type { ComponentType } from 'react';

function DesignLabUnavailable() {
  return null;
}

export const DesignLabScreen: ComponentType<Record<string, never>> = __DEV__
  ? require('@/screens/dev/DesignLabScreen').default
  : DesignLabUnavailable;
