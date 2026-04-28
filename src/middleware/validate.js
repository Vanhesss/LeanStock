const { ZodError } = require('zod');
const { ValidationError } = require('../utils/errors');

const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError('Validation failed', { errors: details }));
      } else {
        next(error);
      }
    }
  };
};

module.exports = { validate };
