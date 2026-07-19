const { validationResult } = require('express-validator');
const { ApiError } = require('./error');

// Runs after a chain of express-validator checks. If any failed, it
// short-circuits with a 400 and the list of problems. Use on every route
// that accepts input (see CLAUDE.md: never trust req.body directly).
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return next(new ApiError(400, 'Validation failed', details));
}

module.exports = { validate };
