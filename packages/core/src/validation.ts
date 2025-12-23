/**
 * Input validation utilities for ProjectFlow domain
 */

import { ValidationError } from './errors';

/**
 * Validates that a string is a valid UUID v4
 */
export function validateUUID(value: string, fieldName: string = 'ID'): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
}

/**
 * Validates project input data
 */
export function validateProjectData(data: {
  name?: unknown;
  description?: unknown;
}): void {
  if (typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new ValidationError('Project name is required and must be a non-empty string', 'name');
  }

  if (data.name.length > 255) {
    throw new ValidationError('Project name must be less than 255 characters', 'name');
  }

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      throw new ValidationError('Project description must be a string', 'description');
    }
    if (data.description.length > 1000) {
      throw new ValidationError('Project description must be less than 1000 characters', 'description');
    }
  }
}

/**
 * Validates task input data
 */
export function validateTaskData(data: {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
}): void {
  if (typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new ValidationError('Task title is required and must be a non-empty string', 'title');
  }

  if (data.title.length > 255) {
    throw new ValidationError('Task title must be less than 255 characters', 'title');
  }

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      throw new ValidationError('Task description must be a string', 'description');
    }
    if (data.description.length > 1000) {
      throw new ValidationError('Task description must be less than 1000 characters', 'description');
    }
  }

  if (data.status !== undefined && data.status !== null) {
    const validStatuses = ['todo', 'in_progress', 'done'];
    if (!validStatuses.includes(String(data.status))) {
      throw new ValidationError('Task status must be one of: todo, in_progress, done', 'status');
    }
  }

  if (data.priority !== undefined && data.priority !== null) {
    const validPriorities = ['low', 'medium', 'high'];
    if (!validPriorities.includes(String(data.priority))) {
      throw new ValidationError('Task priority must be one of: low, medium, high', 'priority');
    }
  }
}

/**
 * Validates session data
 */
export function validateSessionData(data: {
  snapshot?: unknown;
  summary?: unknown;
}): void {
  if (data.snapshot !== undefined && typeof data.snapshot !== 'object') {
    throw new ValidationError('Session snapshot must be an object', 'snapshot');
  }

  if (data.summary !== undefined && data.summary !== null) {
    if (typeof data.summary !== 'string') {
      throw new ValidationError('Session summary must be a string', 'summary');
    }
    if (data.summary.length > 2000) {
      throw new ValidationError('Session summary must be less than 2000 characters', 'summary');
    }
  }
}

