import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const details = err.errors?.map(e => ({ field: (e.path || []).join('.'), message: e.message })) || null;
    return res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details,
    });
  }

  const code = err.code || 'INTERNAL_ERROR';
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message || 'An unexpected error occurred';
  const details = err.details ?? null;

  if (status >= 500) console.error(err);
  res.status(status).json({ code, message, details });
}
