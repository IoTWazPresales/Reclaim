import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ScheduleOverlayItem =
  | {
      key: string;
      time: Date;
      kind: 'med';
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      title: string;
      subtitle?: string;
      medId: string;
      scheduledISO: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'sleep';
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      title: string;
      subtitle?: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'info';
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      title: string;
      subtitle?: string;
      onPress?: () => void;
    };

type Props = {
  open: boolean;
  items: ScheduleOverlayItem[]; // should already be sorted
  onClose: () => void;
  onTakeDose?: (medId: string, scheduledISO: string) => void;
  title?: string;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function ScheduleOverlay({
  open,
  items,
  onClose,
  onTakeDose,
  title = 'Schedule',
}: Props) {
  const theme = useTheme();

  const now = new Date();

  // Range: now -> tomorrow 12:00
  const ranged = useMemo(() => {
    const start = new Date(now.getTime() - 5 * 60 * 1000); // include “just started”
    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(12, 0, 0, 0); // tomorrow 12:00

    return (items ?? [])
      .filter((it) => it?.time && Number.isFinite(it.time.getTime()))
      .filter((it) => it.time.getTime() >= start.getTime() && it.time.getTime() <= end.getTime())
      .slice(0, 25);
  }, [items]);

  const handleTakeDose = useCallback(
    (medId: string, scheduledISO: string) => {
      if (!onTakeDose) return;
      onTakeDose(medId, scheduledISO);
    },
    [onTakeDose],
  );

  if (!open) return null;

  const kindStyle = (kind: ScheduleOverlayItem['kind']) => {
    // Keep it subtle; different vibe per kind
    if (kind === 'med') {
      return {
        bg: theme.colors.primaryContainer,
        iconBg: theme.colors.primary,
        iconFg: theme.colors.onPrimary,
        border: theme.colors.primary,
      };
    }
    if (kind === 'sleep') {
      return {
        bg: theme.colors.secondaryContainer,
        iconBg: theme.colors.secondary,
        iconFg: theme.colors.onSecondary,
        border: theme.colors.secondary,
      };
    }
    return {
      bg: theme.colors.surfaceVariant,
      iconBg: theme.colors.background,
      iconFg: theme.colors.onSurface,
      border: theme.colors.outlineVariant ?? theme.colors.outline,
    };
  };

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.backdrop,
        }}
      />

      {/* Sheet */}
      <View
        style={{
          borderRadius: 18,
          backgroundColor: theme.colors.surface,
          padding: 14,
          maxHeight: '80%',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          >
            <MaterialCommunityIcons name="calendar-month-outline" size={20} color={theme.colors.onSurface} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
              {title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              Now → tomorrow 12:00 • {ranged.length} item{ranged.length === 1 ? '' : 's'}
            </Text>
          </View>

          <Button mode="text" onPress={onClose} compact>
            Close
          </Button>
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
          {ranged.length === 0 ? (
            <View style={{ paddingVertical: 18 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Nothing in the next planning window. (Now → tomorrow midday)
              </Text>
            </View>
          ) : (
            ranged.map((item) => {
              const isPast = item.time.getTime() < Date.now() - 60 * 1000;
              const timeLabel = formatTime(item.time);

              const s = kindStyle(item.kind);

              return (
                <Pressable
                  key={item.key}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: s.bg,
                    marginBottom: 10,
                    opacity: isPast ? 0.6 : 1,
                    borderLeftWidth: 4,
                    borderLeftColor: s.border,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      backgroundColor: s.iconBg,
                    }}
                  >
                    <MaterialCommunityIcons name={item.icon} size={20} color={s.iconFg} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
                      {item.kind === 'med' ? timeLabel : `${timeLabel} • ${item.title}`}
                    </Text>

                    <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                      {item.kind === 'med' ? item.title : item.subtitle ?? ''}
                    </Text>

                    {item.kind === 'med' && item.subtitle ? (
                      <Text
                        variant="bodySmall"
                        style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, opacity: 0.85 }}
                      >
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  {/* ✅ Med “Taken” button — prevent row press */}
                  {item.kind === 'med' && onTakeDose ? (
                    <View
                      onStartShouldSetResponder={() => true}
                      onResponderRelease={() => {
                        // prevent parent Pressable from also receiving tap
                      }}
                    >
                      <Button
                        mode="contained"
                        compact
                        onPress={() => handleTakeDose(item.medId, item.scheduledISO)}
                      >
                        Taken
                      </Button>
                    </View>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}
