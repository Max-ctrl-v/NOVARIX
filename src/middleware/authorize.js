import { AppError } from './errorHandler.js';

// Rollen-basierte Zugriffskontrolle (RBAC)
// Nutzung: authorize('admin') oder authorize('admin', 'editor')
export function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      throw new AppError('Nicht authentifiziert.', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        'Keine Berechtigung für diese Aktion.',
        403
      );
    }

    next();
  };
}
