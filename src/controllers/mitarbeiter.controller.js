import * as service from '../services/mitarbeiter.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const mitarbeiter = await service.getAll({
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json(mitarbeiter);
});

export const getById = asyncHandler(async (req, res) => {
  const ma = await service.getById(req.params.id);
  res.json(ma);
});

export const create = asyncHandler(async (req, res) => {
  const ma = await service.create(req.body, req.user.id);
  res.status(201).json(ma);
});

export const update = asyncHandler(async (req, res) => {
  const ma = await service.update(req.params.id, req.body, req.user.id);
  res.json(ma);
});

export const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user.id);
  res.json({ message: 'Mitarbeiter in Papierkorb verschoben.' });
});
