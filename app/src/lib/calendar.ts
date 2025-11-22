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
      const granted = await requestCalendarPermissions();
      if (!granted) {
        return [];
      }
    }

    const calendarModule = await getCalendarModule();
    if (!calendarModule) {
      logger.warn('expo-calendar module not available');
      return [];
    }

    const calendars = await calendarModule.getCalendarsAsync(calendarModule.EntityTypes.EVENT);
    if (calendars.length === 0) {
      logger.debug('No calendars found');
      return [];
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const events: CalendarEvent[] = [];

    for (const calendar of calendars) {
      if (!calendar.allowsModifications && !calendar.source?.type) continue; // Skip read-only calendars if needed

      try {
        const calendarEvents = await calendarModule.getEventsAsync(
          [calendar.id],
          startOfDay,
          endOfDay
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
    logger.error('Failed to get today events:', error);
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

