/**
 * Calendar Card Component
 * Displays today's calendar events with automatic cleanup of past events
 */
import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, useTheme, Chip, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar';
import { format, formatDistanceToNow, isPast, isWithinInterval } from 'date-fns';
import { useAppTheme } from '@/theme';

const REMINDER_MINUTES = 15; // Remind user 15 minutes before event

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) {
    return 'All day';
  }
  return format(event.startDate, 'h:mm a');
}

function formatEventDuration(event: CalendarEvent): string {
  if (event.allDay) {
    return '';
  }
  const durationMs = event.endDate.getTime() - event.startDate.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getEventStatus(event: CalendarEvent): 'upcoming' | 'current' | 'past' | 'warning' {
  const now = new Date();
  
  if (isPast(event.endDate)) {
    return 'past';
  }
  
  if (isWithinInterval(now, { start: event.startDate, end: event.endDate })) {
    return 'current';
  }
  
  // Check if within reminder window (15 minutes before)
  const reminderTime = new Date(event.startDate.getTime() - REMINDER_MINUTES * 60 * 1000);
  if (now >= reminderTime && now < event.startDate) {
    return 'warning';
  }
  
  return 'upcoming';
}

function getEventIcon(event: CalendarEvent): string {
  const title = event.title.toLowerCase();
  
  if (title.includes('doctor') || title.includes('appointment') || title.includes('medical')) {
    return 'medical-bag';
  }
  if (title.includes('work') || title.includes('meeting')) {
    return 'briefcase';
  }
  if (title.includes('gym') || title.includes('exercise') || title.includes('workout')) {
    return 'dumbbell';
  }
  if (title.includes('lunch') || title.includes('dinner') || title.includes('meal')) {
    return 'food';
  }
  if (title.includes('therapy') || title.includes('counseling')) {
    return 'heart-pulse';
  }
  
  return 'calendar-clock';
}

type CalendarCardProps = {
  testID?: string;
};

export function CalendarCard({ testID }: CalendarCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const styles = React.useMemo(() => makeStyles(appTheme), [appTheme]);
  const [now, setNow] = useState(new Date());

  // Update time every minute to refresh event statuses
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const { data: events = [], isLoading, error } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'today'],
    queryFn: getTodayEvents,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: false,
    throwOnError: false,
  });

  // Filter out past events and sort by start time
  const activeEvents = useMemo(() => {
    return events
      .filter(event => {
        const status = getEventStatus(event);
        return status !== 'past'; // Remove past events
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, now]);

  const upcomingEvents = useMemo(() => {
    return activeEvents.filter(event => getEventStatus(event) === 'upcoming');
  }, [activeEvents]);

  const currentEvents = useMemo(() => {
    return activeEvents.filter(event => getEventStatus(event) === 'current');
  }, [activeEvents]);

  const warningEvents = useMemo(() => {
    return activeEvents.filter(event => getEventStatus(event) === 'warning');
  }, [activeEvents]);

  if (isLoading) {
    return (
      <Card mode="elevated" style={[styles.card, { backgroundColor: theme.colors.surface }]} testID={testID}>
        <Card.Content>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="calendar-today"
              size={24}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text variant="titleMedium" style={{ marginLeft: 8 }}>
              Today's Schedule
            </Text>
          </View>
          <ActivityIndicator animating style={{ marginTop: 12 }} />
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    // Log error for debugging but don't show to user
    console.warn('CalendarCard error:', error);
    return null; // Silently fail if calendar permission not granted
  }

  if (activeEvents.length === 0) {
    return (
      <Card mode="elevated" style={[styles.card, { backgroundColor: theme.colors.surface }]} testID={testID}>
        <Card.Content>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="calendar-today"
              size={24}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text variant="titleMedium" style={{ marginLeft: 8 }}>
              Today's Schedule
            </Text>
          </View>
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No events scheduled for today
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Add events to your device calendar to see them here
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card mode="elevated" style={[styles.card, { backgroundColor: theme.colors.surface }]} testID={testID}>
      <Card.Content>
          <View style={styles.header} accessibilityRole="header">
            <MaterialCommunityIcons
              name="calendar-today"
              size={24}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text variant="titleMedium" style={{ marginLeft: 8 }} accessibilityRole="text">
              Today's Schedule
            </Text>
            {activeEvents.length > 0 && (
              <Chip
                mode="flat"
                compact
                style={{ marginLeft: 'auto', backgroundColor: theme.colors.primaryContainer }}
                textStyle={{ fontSize: 12 }}
                accessibilityLabel={`${activeEvents.length} events scheduled`}
              >
                {activeEvents.length}
              </Chip>
            )}
          </View>

        {/* Warning events (within 15 minutes) */}
        {warningEvents.length > 0 && (
          <View style={styles.eventsSection}>
            {warningEvents.map((event) => {
              const icon = getEventIcon(event);
              const timeUntil = formatDistanceToNow(event.startDate, { addSuffix: true });
              return (
                <View
                  key={event.id}
                  style={[
                    styles.eventItem,
                    {
                      backgroundColor: theme.colors.errorContainer,
                      borderLeftColor: theme.colors.error,
                      borderLeftWidth: 4,
                    },
                  ]}
                  accessibilityRole="alert"
                  accessibilityLabel={`Warning: ${event.title} starting ${timeUntil}`}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={20}
                    color={theme.colors.error}
                    style={styles.eventIcon}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <View style={styles.eventContent}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onErrorContainer }} accessibilityRole="text">
                      {event.title}
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onErrorContainer }} accessibilityRole="text">
                      {formatEventTime(event)} • {timeUntil}
                    </Text>
                    {event.location && (
                      <Text variant="bodySmall" style={{ marginTop: 2, opacity: 0.7, color: theme.colors.onErrorContainer }} accessibilityRole="text">
                        📍 {event.location}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Current events */}
        {currentEvents.length > 0 && (
          <View style={styles.eventsSection}>
            {currentEvents.map((event) => {
              const icon = getEventIcon(event);
              return (
                <View
                  key={event.id}
                  style={[
                    styles.eventItem,
                    {
                      backgroundColor: theme.colors.primaryContainer,
                      borderLeftColor: theme.colors.primary,
                      borderLeftWidth: 4,
                    },
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={`Current event: ${event.title}, until ${formatEventTime(event)}${event.location ? `, location: ${event.location}` : ''}`}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={20}
                    color={theme.colors.primary}
                    style={styles.eventIcon}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <View style={styles.eventContent}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onPrimaryContainer }} accessibilityRole="text">
                      {event.title}
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onPrimaryContainer }} accessibilityRole="text">
                      Now • Until {formatEventTime(event)}
                    </Text>
                    {event.location && (
                      <Text variant="bodySmall" style={{ marginTop: 2, opacity: 0.7, color: theme.colors.onPrimaryContainer }} accessibilityRole="text">
                        📍 {event.location}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <View style={styles.eventsSection}>
            {upcomingEvents.map((event) => {
              const icon = getEventIcon(event);
              const duration = formatEventDuration(event);
              return (
                <View
                  key={event.id}
                  style={[
                    styles.eventItem,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderLeftColor: theme.colors.secondary,
                      borderLeftWidth: 4,
                    },
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={`Upcoming event: ${event.title} at ${formatEventTime(event)}${duration ? `, duration: ${duration}` : ''}${event.allDay ? ', all day' : ''}${event.location ? `, location: ${event.location}` : ''}`}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={20}
                    color={theme.colors.secondary}
                    style={styles.eventIcon}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <View style={styles.eventContent}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurfaceVariant }} accessibilityRole="text">
                      {event.title}
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }} accessibilityRole="text">
                      {formatEventTime(event)}
                      {duration && ` • ${duration}`}
                      {event.allDay && ' • All day'}
                    </Text>
                    {event.location && (
                      <Text variant="bodySmall" style={{ marginTop: 2, opacity: 0.7, color: theme.colors.onSurfaceVariant }} accessibilityRole="text">
                        📍 {event.location}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.borderRadius.xxl,
      marginBottom: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyState: {
      paddingVertical: theme.spacing.xxl,
      alignItems: 'center',
    },
    eventsSection: {
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    eventItem: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    },
    eventIcon: {
      marginRight: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    eventContent: {
      flex: 1,
    },
  });
}

