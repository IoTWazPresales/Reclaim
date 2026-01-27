/**
 * Calendar Integration
 * Read calendar events from device calendar
 */
import { Platform } from 'react-native';
import { logger } from './logger';

// Lazy import expo-calendar (may not be installed yet)
let Calendar: typeof import('expo-calendar') | null = null;

async function getCalendarModule() {
  if (Calendar) return Calendar;
  try {
    Calendar = await import('expo-calendar');
    return Calendar;
  } catch (error) {
    logger.warn('expo-calendar not installed:', error);
    return null;
  }
}

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  notes?: string;
  location?: string;
  allDay?: boolean;
  calendarId?: string;
  calendarTitle?: string;
};

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      logger.warn('Calendar permissions not supported on web');
      return false;
    }

    const calendarModule = await getCalendarModule();
    if (!calendarModule) return false;

    const { status } = await calendarModule.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Failed to request calendar permissions:', error);
    return false;
  }
}

/**
 * Check calendar permissions
 */
export async function hasCalendarPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return false;
    }

    const calendarModule = await getCalendarModule();
    if (!calendarModule) return false;

    const { status } = await calendarModule.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    logger.error('Failed to check calendar permissions:', error);
    return false;
  }
}

/**
 * Get calendar events for today
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
  try {
    const hasPermission = await hasCalendarPermissions();
    if (!hasPermission) {
      logger.debug('Calendar permissions not granted, requesting...');
      const granted = await requestCalendarPermissions();
      if (!granted) {
        logger.warn('Calendar permissions denied by user');
        return [];
      }
      logger.debug('Calendar permissions granted');
    }

    const calendarModule = await getCalendarModule();
    if (!calendarModule) {
      logger.warn('expo-calendar module not available');
      return [];
    }
    logger.debug('Calendar module loaded successfully');

    const calendars = await calendarModule.getCalendarsAsync(calendarModule.EntityTypes.EVENT);
    logger.debug(`Found ${calendars.length} calendars`);
    if (calendars.length === 0) {
      logger.warn('No calendars found on device');
      return [];
    }

    // Log calendar details for debugging
    calendars.forEach((cal) => {
      logger.debug(`Calendar: ${cal.title}`, {
        id: cal.id,
        allowsModifications: cal.allowsModifications,
        source: cal.source?.type,
        isPrimary: cal.isPrimary,
      });
    });

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    logger.debug('Fetching events for date range', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
    });

    const events: CalendarEvent[] = [];

    for (const calendar of calendars) {
      // Don't filter out calendars - include all calendars that have events
      // The original filter was too restrictive and might exclude all calendars
      try {
        logger.debug(`Fetching events from calendar: ${calendar.title} (${calendar.id})`);
        const calendarEvents = await calendarModule.getEventsAsync(
          [calendar.id],
          startOfDay,
          endOfDay
        );

        logger.debug(`Found ${calendarEvents.length} events in calendar ${calendar.title}`);

        for (const event of calendarEvents) {
          events.push({
            id: event.id,
            title: event.title || 'Untitled Event',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            notes: event.notes ?? undefined,
            location: event.location ?? undefined,
            allDay: event.allDay ?? false,
            calendarId: calendar.id,
            calendarTitle: calendar.title,
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch events from calendar ${calendar.title}:`, error);
        logger.warn('Calendar error details:', {
          calendarId: calendar.id,
          calendarTitle: calendar.title,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Sort by start time
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    logger.debug(`Retrieved ${events.length} events for today`);
    return events;
  } catch (error) {
    logger.error('Failed to get today events:', error);
    logger.error('Error details:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Get upcoming events for the next N hours
 */
export async function getUpcomingEvents(hours: number = 24): Promise<CalendarEvent[]> {
  try {
    const hasPermission = await hasCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        return [];
      }
    }

    const calendarModule = await getCalendarModule();
    if (!calendarModule) return [];

    const calendars = await calendarModule.getCalendarsAsync(calendarModule.EntityTypes.EVENT);
    if (calendars.length === 0) {
      return [];
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const events: CalendarEvent[] = [];

    for (const calendar of calendars) {
      try {
        const calendarEvents = await calendarModule.getEventsAsync(
          [calendar.id],
          now,
          endTime
        );

        for (const event of calendarEvents) {
          // Filter out past events
          if (new Date(event.endDate) < now) continue;

          events.push({
            id: event.id,
            title: event.title || 'Untitled Event',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            notes: event.notes ?? undefined,
            location: event.location ?? undefined,
            allDay: event.allDay ?? false,
            calendarId: calendar.id,
            calendarTitle: calendar.title,
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch upcoming events from calendar ${calendar.title}:`, error);
      }
    }

    // Sort by start time
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return events;
  } catch (error) {
    logger.error('Failed to get upcoming events:', error);
    return [];
  }
}

/**
 * Get events for a specific date range
 */
export async function getEventsForDateRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
  try {
    const hasPermission = await hasCalendarPermissions();
    if (!hasPermission) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        return [];
      }
    }

    const calendarModule = await getCalendarModule();
    if (!calendarModule) return [];

    const calendars = await calendarModule.getCalendarsAsync(calendarModule.EntityTypes.EVENT);
    if (calendars.length === 0) {
      return [];
    }

    const events: CalendarEvent[] = [];

    for (const calendar of calendars) {
      try {
        const calendarEvents = await calendarModule.getEventsAsync(
          [calendar.id],
          startDate,
          endDate
        );

        for (const event of calendarEvents) {
          events.push({
            id: event.id,
            title: event.title || 'Untitled Event',
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            notes: event.notes ?? undefined,
            location: event.location ?? undefined,
            allDay: event.allDay ?? false,
            calendarId: calendar.id,
            calendarTitle: calendar.title,
          });
        }
      } catch (error) {
        logger.warn(`Failed to fetch events from calendar ${calendar.title}:`, error);
      }
    }

    // Sort by start time
    events.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return events;
  } catch (error) {
    logger.error('Failed to get events for date range:', error);
    return [];
  }
}

const DEFAULT_WORKOUT_HOUR = 18;
const DEFAULT_WORKOUT_DURATION_MINUTES = 60;

/**
 * Create a single event in the device calendar. Uses the first writable calendar.
 * Requires calendar write permission.
 */
export async function createCalendarEvent(params: {
  title: string;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  calendarId?: string;
}): Promise<string | null> {
  try {
    const granted = await requestCalendarPermissions();
    if (!granted) {
      logger.warn('Calendar write permission not granted');
      return null;
    }
    const calendarModule = await getCalendarModule();
    if (!calendarModule || !(calendarModule as any).createEventAsync) {
      logger.warn('expo-calendar createEventAsync not available');
      return null;
    }
    const calendars = await calendarModule.getCalendarsAsync(calendarModule.EntityTypes.EVENT);
    const writable = calendars.filter((c: any) => c.allowsModifications !== false);
    const calendarId = params.calendarId ?? writable[0]?.id ?? calendars[0]?.id;
    if (!calendarId) {
      logger.warn('No writable calendar found');
      return null;
    }
    const endDate = params.endDate ?? new Date(params.startDate.getTime() + DEFAULT_WORKOUT_DURATION_MINUTES * 60 * 1000);
    const id = await (calendarModule as any).createEventAsync(calendarId, {
      title: params.title,
      startDate: params.startDate,
      endDate,
      notes: params.notes ?? undefined,
    });
    return id ?? null;
  } catch (error) {
    logger.warn('createCalendarEvent failed', error);
    return null;
  }
}

/**
 * Create workout (gym) events for the given dates at default time (e.g. 18:00, 1 hour).
 */
export async function createWorkoutEventsForDates(dates: Date[], title: string = 'Workout'): Promise<number> {
  let created = 0;
  for (const d of dates) {
    const start = new Date(d);
    start.setHours(DEFAULT_WORKOUT_HOUR, 0, 0, 0);
    const id = await createCalendarEvent({ title, startDate: start });
    if (id) created += 1;
  }
  return created;
}

