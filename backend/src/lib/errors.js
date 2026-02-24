/**
 * Application errors for consistent API responses.
 * Use with errorHandler middleware (status, code, message, details).
 */
export function validationError(message, details = null) {
  const err = new Error(message);
  err.status = 400;
  err.code = 'VALIDATION_ERROR';
  err.details = details;
  return err;
}

export function notFoundError(message = 'Resource not found') {
  const err = new Error(message);
  err.status = 404;
  err.code = 'NOT_FOUND';
  return err;
}

export function locationNotFoundError(message = 'Location not found. Please check the name, zip code, or coordinates.') {
  const err = new Error(message);
  err.status = 404;
  err.code = 'LOCATION_NOT_FOUND';
  return err;
}

export function upstreamError(message = 'Weather service temporarily unavailable. Please try again later.', details = null) {
  const err = new Error(message);
  err.status = 502;
  err.code = 'UPSTREAM_WEATHER_ERROR';
  err.details = details;
  return err;
}
