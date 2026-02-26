import * as service from '../services/zuweisung.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getByProjekt = asyncHandler(async (req, res) => {
  const zuweisungen = await service.getByProjekt(req.params.pid);
  res.json(zuweisungen);
});

export const getById = asyncHandler(async (req, res) => {
  const zuw = await service.getById(req.params.id);
  res.json(zuw);
});

export const create = asyncHandler(async (req, res) => {
  const zuw = await service.create(req.params.pid, req.body, req.user.id);
  res.status(201).json(zuw);
});

export const update = asyncHandler(async (req, res) => {
  const zuw = await service.update(req.params.id, req.body, req.user.id);
  res.json(zuw);
});

export const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user.id);
  res.json({ message: 'Zuweisung in Papierkorb verschoben.' });
});
