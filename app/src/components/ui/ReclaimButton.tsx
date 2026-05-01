import React, { useMemo } from 'react';
import { Button, useTheme } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import {
  reclaimGhostCapsuleButton,
  reclaimPrimaryCapsuleButton,
  reclaimSecondaryCapsuleButton,
  reclaimTertiaryOutlineCapsuleButton,
} from '@/theme/reclaimVisualLanguage';

export type ReclaimButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';

type PaperButtonProps = React.ComponentProps<typeof Button>;

export type ReclaimButtonProps = Omit<PaperButtonProps, 'mode'> & {
  variant: ReclaimButtonVariant;
  /** Overrides default label/icon color (e.g. `theme.colors.error` on tertiary). */
  textColor?: string;
};

/**
 * Thin enforcement point for Reclaim capsule buttons — same visual language as Dashboard / SchedulingCard.
 * Prefer this over raw Paper `Button` on product screens that were drifting to default MD3.
 */
export function ReclaimButton({
  variant,
  children,
  textColor: textColorOverride,
  style,
  contentStyle,
  labelStyle,
  buttonColor: buttonColorProp,
  ...rest
}: ReclaimButtonProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const primary = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const secondary = useMemo(() => reclaimSecondaryCapsuleButton(appTheme), [appTheme]);
  const tertiary = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);
  const ghost = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);

  if (variant === 'primary') {
    return (
      <Button
        mode="contained"
        buttonColor={buttonColorProp ?? theme.colors.primary}
        textColor={textColorOverride ?? theme.colors.onPrimary}
        style={[primary.style, style]}
        contentStyle={[primary.contentStyle, contentStyle]}
        labelStyle={[
          primary.labelStyle,
          { color: textColorOverride ?? theme.colors.onPrimary },
          labelStyle,
        ]}
        {...rest}
      >
        {children}
      </Button>
    );
  }

  if (variant === 'secondary') {
    return (
      <Button
        mode="outlined"
        textColor={textColorOverride ?? theme.colors.onSurface}
        style={[secondary.style, style]}
        contentStyle={[secondary.contentStyle, contentStyle]}
        labelStyle={[
          secondary.labelStyle,
          ...(textColorOverride ? [{ color: textColorOverride }] : []),
          labelStyle,
        ]}
        {...rest}
      >
        {children}
      </Button>
    );
  }

  if (variant === 'tertiary') {
    return (
      <Button
        mode="outlined"
        textColor={textColorOverride ?? theme.colors.primary}
        style={[tertiary.style, style]}
        contentStyle={[tertiary.contentStyle, contentStyle]}
        labelStyle={[
          tertiary.labelStyle,
          textColorOverride ? { color: textColorOverride } : { color: theme.colors.primary },
          labelStyle,
        ]}
        {...rest}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      mode="text"
      textColor={textColorOverride ?? theme.colors.primary}
      style={[ghost.style, style]}
      contentStyle={[ghost.contentStyle, contentStyle]}
      labelStyle={[
        ghost.labelStyle,
        ...(textColorOverride ? [{ color: textColorOverride }] : []),
        labelStyle,
      ]}
      {...rest}
    >
      {children}
    </Button>
  );
}
