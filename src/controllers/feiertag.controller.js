import * as service from '../services/feiertag.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const feiertage = await service.getAll();
  res.json(feiertage);
});

export const create = asyncHandler(async (req, res) => {
  const feiertag = await service.create(req.body, req.user.id);
  res.status(201).json(feiertag);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id);
  res.json({ message: 'Feiertag gelöscht.' });
});
