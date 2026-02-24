import * as weatherRequestService from '../services/weatherRequestService.js';

export async function create(req, res, next) {
  try {
    const result = await weatherRequestService.createWeatherRequest(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function list(req, res, next) {
  try {
    const { locationName, startDate, endDate, limit, offset } = req.query;
    const items = await weatherRequestService.listWeatherRequests({
      locationName,
      startDate,
      endDate,
      limit,
      offset,
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

export async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(Object.assign(new Error('Invalid id'), { status: 400, code: 'VALIDATION_ERROR' }));
    const data = await weatherRequestService.getWeatherRequestById(id);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(Object.assign(new Error('Invalid id'), { status: 400, code: 'VALIDATION_ERROR' }));
    const result = await weatherRequestService.updateWeatherRequest(id, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(Object.assign(new Error('Invalid id'), { status: 400, code: 'VALIDATION_ERROR' }));
    await weatherRequestService.deleteWeatherRequest(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
