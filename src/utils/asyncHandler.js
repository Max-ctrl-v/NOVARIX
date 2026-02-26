// Fängt async Fehler in Route-Handlern ab und leitet sie an Express weiter
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
