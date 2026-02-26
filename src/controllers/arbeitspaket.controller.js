import * as service from '../services/arbeitspaket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getByProjekt = asyncHandler(async (req, res) => {
  const aps = await service.getByProjekt(req.params.pid);
  res.json(aps);
});

export const getById = asyncHandler(async (req, res) => {
  const ap = await service.getById(req.params.id);
  res.json(ap);
});

export const create = asyncHandler(async (req, res) => {
  const ap = await service.create(req.params.pid, req.body, req.user.id);
  res.status(201).json(ap);
});

export const createChild = asyncHandler(async (req, res) => {
  const ap = await service.createChild(req.params.id, req.body, req.user.id);
  res.status(201).json(ap);
});

export const update = asyncHandler(async (req, res) => {
  const ap = await service.update(req.params.id, req.body, req.user.id);
  res.json(ap);
});

export const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user.id);
  res.json({ message: 'Arbeitspaket in Papierkorb verschoben.' });
});
