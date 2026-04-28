class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

class NotFoundError extends AppError {
  constructor(entity, id) {
    super(404, 'RESOURCE_NOT_FOUND', `${entity}${id ? ` with id ${id}` : ''} not found`);
  }
}

class ConflictError extends AppError {
  constructor(message, details) {
    super(409, 'CONFLICT', message, details);
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

module.exports = { AppError, NotFoundError, ConflictError, ValidationError, UnauthorizedError, ForbiddenError };
