import * as service from '../services/ueberprojekt.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const firmen = await service.getAll({
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json(firmen);
});

export const getById = asyncHandler(async (req, res) => {
  const firma = await service.getById(req.params.id);
  res.json(firma);
});

export const create = asyncHandler(async (req, res) => {
  const firma = await service.create(req.body, req.user.id);
  res.status(201).json(firma);
});

export const update = asyncHandler(async (req, res) => {
  const firma = await service.update(req.params.id, req.body, req.user.id);
  res.json(firma);
});

export const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user.id);
  res.json({ message: 'Firma in Papierkorb verschoben.' });
});
