const { ForbiddenError, UnauthorizedError } = require('../utils/errors');

const ROLE_HIERARCHY = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
};

const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const minRequiredLevel = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r]));

    if (userRoleLevel < minRequiredLevel) {
      return next(new ForbiddenError(`Role ${req.user.role} does not have access. Required: ${allowedRoles.join(' or ')}`));
    }

    next();
  };
};

module.exports = { authorize };
