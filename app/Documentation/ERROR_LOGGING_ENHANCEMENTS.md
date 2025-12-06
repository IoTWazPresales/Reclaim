# Error Logging Enhancements

## Overview
Enhanced the error logging system to automatically log all errors to Supabase with comprehensive error information. You can now view all errors in your Supabase `logs` table.

## What Was Enhanced

### 1. Enhanced Logger (`app/src/lib/logger.ts`)

#### New Features:
- **Comprehensive Error Information**: Now captures:
  - Error message
  - Stack trace
  - Error name/type (TypeError, ReferenceError, etc.)
  - Error code (if available)
  - Source location (file, function, line number) extracted from stack trace
  - Context and metadata

- **Error Categories**: Automatically categorizes errors:
  - `runtime_error` - General runtime errors
  - `react_error_boundary` - React component errors
  - `unhandled_error` - Unhandled errors
  - `unhandled_promise_rejection` - Unhandled promise rejections
  - `type_error`, `reference_error`, `network_error`, `api_error` - Specific error types

- **Enhanced `logger.error()`**: Automatically extracts Error objects from arguments and logs comprehensive information

- **New `logger.logError()` Method**: 
  ```typescript
  logger.logError(
    message: string,
    error?: Error,
    context?: {
      category?: string;
      source?: string;
      tags?: Record<string, string>;
    }
  )
  ```

- **New `logger.logWarning()` Method**: Log important warnings to Supabase

### 2. Global Error Handlers (`app/App.tsx`)

Added global error handlers to catch:
- **Unhandled Errors**: Catches errors that aren't caught by try/catch blocks
- **Unhandled Promise Rejections**: Catches promise rejections that aren't handled

These are automatically logged to Supabase with category `unhandled_error` and `unhandled_promise_rejection`.

### 3. Enhanced ErrorBoundary

Updated the React ErrorBoundary to use the enhanced logger with proper context:
- Category: `react_error_boundary`
- Source: `ErrorBoundary`
- Tags: `errorId`, `retryCount`

## How to View Errors in Supabase

### Query All Errors:
```sql
SELECT * FROM logs 
WHERE level = 'error' 
ORDER BY created_at DESC;
```

### Query Errors by User:
```sql
SELECT * FROM logs 
WHERE level = 'error' 
AND user_id = 'your-user-id'
ORDER BY created_at DESC;
```

### Query Errors by Category:
```sql
SELECT * FROM logs 
WHERE level = 'error' 
AND details->>'category' = 'runtime_error'
ORDER BY created_at DESC;
```

### Query Recent Errors (Last 24 hours):
```sql
SELECT * FROM logs 
WHERE level = 'error' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Query Errors with Stack Traces:
```sql
SELECT 
  id,
  user_id,
  message,
  details->>'stackTrace' as stack_trace,
  details->>'source' as source_location,
  created_at
FROM logs 
WHERE level = 'error' 
AND details->>'stackTrace' IS NOT NULL
ORDER BY created_at DESC;
```

## Logs Table Schema

The `logs` table has the following structure:
- `id` (UUID) - Primary key
- `user_id` (UUID) - User who encountered the error (nullable)
- `level` (TEXT) - Log level: 'error' or 'warning'
- `message` (TEXT) - Error message
- `details` (JSONB) - Comprehensive error details including:
  - `originalMessage` - Original error message
  - `errorName` - Error type (TypeError, ReferenceError, etc.)
  - `errorCode` - Error code if available
  - `stackTrace` - Full stack trace
  - `source` - Source location (file, function, line)
  - `category` - Error category
  - `tags` - Additional tags for filtering
  - `context` - Additional context/metadata
- `created_at` (TIMESTAMPTZ) - When the error occurred

## Usage Examples

### Basic Error Logging (Automatic):
```typescript
// All errors logged via logger.error() are automatically sent to Supabase
try {
  // some code
} catch (error) {
  logger.error('Failed to sync data', error);
  // Error is automatically logged to Supabase with full details
}
```

### Explicit Error Logging with Context:
```typescript
try {
  await syncHealthData();
} catch (error) {
  await logger.logError(
    'Health data sync failed',
    error instanceof Error ? error : new Error(String(error)),
    {
      category: 'health_sync_error',
      source: 'syncHealthData',
      tags: {
        provider: 'samsung_health',
        syncType: 'historical',
      },
    }
  );
}
```

### Logging Warnings:
```typescript
if (someCondition) {
  await logger.logWarning(
    'Low activity detected',
    { steps: 500 },
    {
      category: 'health_warning',
      source: 'activityMonitor',
      tags: {
        threshold: '3000',
      },
    }
  );
}
```

## Benefits

1. **Centralized Error Tracking**: All errors in one place (Supabase)
2. **Comprehensive Information**: Stack traces, source locations, context
3. **User Tracking**: See which users are experiencing which errors
4. **Error Categorization**: Filter and analyze errors by category
5. **Automatic Logging**: No need to manually add logging - it's automatic
6. **Non-Breaking**: If Supabase logging fails, the app continues to work
7. **Production Ready**: Works in both development and production

## Notes

- Errors are logged asynchronously and won't block the app
- If Supabase is not configured, logging fails silently
- All error logging is non-blocking - app continues even if logging fails
- Stack traces are automatically extracted and included
- Source locations (file, function, line) are parsed from stack traces when available

## Next Steps

1. **Monitor Errors**: Regularly check the `logs` table in Supabase
2. **Set Up Alerts**: Consider setting up Supabase alerts for critical errors
3. **Analyze Patterns**: Use SQL queries to find common error patterns
4. **Fix Issues**: Use the comprehensive error information to fix bugs quickly

