import * as mediaService from '../services/mediaService.js';

export async function getMedia(req, res, next) {
  try {
    const id = req.params.id;
    if (!id) return next(Object.assign(new Error('Location id is required'), { status: 400, code: 'VALIDATION_ERROR' }));
    const data = await mediaService.getMediaForLocation(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
}
