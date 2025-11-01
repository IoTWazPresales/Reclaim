import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Please enter a valid email address').min(1, 'Email is required');

/**
 * Time format validation (HH:MM)
 */
export const timeSchema = z
  .string()
  .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format (e.g., 07:00)');

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  try {
    emailSchema.parse(email);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message };
    }
    return { valid: false, error: 'Invalid email format' };
  }
}

/**
 * Validate time format (HH:MM)
 */
export function validateTime(time: string): { valid: boolean; error?: string } {
  try {
    timeSchema.parse(time);
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message };
    }
    return { valid: false, error: 'Invalid time format' };
  }
}

