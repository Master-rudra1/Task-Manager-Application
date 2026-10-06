/**
 * Validation & Input Sanitization Middleware
 * Enforces Business Rules 1 & 3, Table B.1 constraints, and REQ-NFR-6 (XSS/Injection mitigation).
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '') // Strip script injection tags
    .slice(0, 2000);
}

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['To-Do', 'In-Progress', 'Review', 'Done'];

function validateTaskCreation(body) {
  const errors = [];

  // Required: workspace_id (UUID)
  if (!body.workspace_id || typeof body.workspace_id !== 'string') {
    errors.push('workspace_id is required and must be a valid UUID string.');
  }

  // Required: created_by (UUID)
  if (!body.created_by || typeof body.created_by !== 'string') {
    errors.push('created_by is required and must be a valid UUID string.');
  }

  // Required: title (Varchar 150)
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('title is required and cannot be empty.');
  } else if (body.title.trim().length > 150) {
    errors.push('title length cannot exceed 150 characters.');
  }

  // Description (Text 2000)
  if (body.description && typeof body.description === 'string' && body.description.length > 2000) {
    errors.push('description cannot exceed 2000 characters.');
  }

  // Required: priority (Enum: Low, Medium, High)
  if (!body.priority || !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`priority is required and must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  // Status (Enum: To-Do, In-Progress, Review, Done) - optional on creation, defaults to To-Do
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  // Business Rule 3: A task cannot have a due date in the past upon initial creation.
  if (body.due_date) {
    const dueDate = new Date(body.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push('due_date must be a valid ISO Date string (YYYY-MM-DD).');
    } else {
      // Compare calendar dates (midnight) to prevent timezone issues
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(dueDate);
      targetDate.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        errors.push('Business Rule 3 Violation: A task cannot have a due date in the past upon initial creation.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateTaskUpdate(body) {
  const errors = [];

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('title cannot be empty.');
    } else if (body.title.trim().length > 150) {
      errors.push('title length cannot exceed 150 characters.');
    }
  }

  if (body.description !== undefined && typeof body.description === 'string' && body.description.length > 2000) {
    errors.push('description cannot exceed 2000 characters.');
  }

  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  if (body.due_date !== undefined && body.due_date !== null) {
    const dueDate = new Date(body.due_date);
    if (isNaN(dueDate.getTime())) {
      errors.push('due_date must be a valid ISO Date string.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  sanitizeString,
  validateTaskCreation,
  validateTaskUpdate,
  VALID_PRIORITIES,
  VALID_STATUSES
};
