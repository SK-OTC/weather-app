import * as weatherRequestService from '../services/weatherRequestService.js';
import { getOptionalAuthenticatedUserId, getRequiredAuthenticatedUserId } from '../lib/auth.js';
import * as globalSearchCountsDb from '../db/globalSearchCounts.js';

export async function create(req, res, next) {
  try {
    const userId = await getOptionalAuthenticatedUserId(req);
    const result = await weatherRequestService.createWeatherRequest({
      ...req.body,
      userId,
    });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function list(req, res, next) {
  try {
    const { locationName, startDate, endDate, limit, offset } = req.query;
    const userId = await getOptionalAuthenticatedUserId(req);
    const items = await weatherRequestService.listWeatherRequests({
      locationName,
      startDate,
      endDate,
      limit,
      offset,
      userId,
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
    const userId = await getOptionalAuthenticatedUserId(req);
    const data = await weatherRequestService.getWeatherRequestById(id, userId);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(Object.assign(new Error('Invalid id'), { status: 400, code: 'VALIDATION_ERROR' }));
    const userId = await getOptionalAuthenticatedUserId(req);
    const result = await weatherRequestService.updateWeatherRequest(id, req.body, userId);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return next(Object.assign(new Error('Invalid id'), { status: 400, code: 'VALIDATION_ERROR' }));
    const userId = await getOptionalAuthenticatedUserId(req);
    await weatherRequestService.deleteWeatherRequest(id, userId);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function sync(req, res, next) {
  try {
    const userId = await getRequiredAuthenticatedUserId(req);
    const { items } = req.body || {};
    const result = await weatherRequestService.syncLocalWeatherResults({
      userId,
      items,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function listGlobalSearches(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const items = await globalSearchCountsDb.listGlobalSearchCounts({ limit });
    res.json({ items });
  } catch (e) {
    next(e);
  }
}
