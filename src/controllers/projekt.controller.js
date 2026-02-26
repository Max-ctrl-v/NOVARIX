import * as service from '../services/projekt.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getByUeberProjekt = asyncHandler(async (req, res) => {
  const projekte = await service.getByUeberProjekt(req.params.uid);
  res.json(projekte);
});

export const getById = asyncHandler(async (req, res) => {
  const projekt = await service.getById(req.params.id);
  res.json(projekt);
});

export const create = asyncHandler(async (req, res) => {
  const projekt = await service.create(req.params.uid, req.body, req.user.id);
  res.status(201).json(projekt);
});

export const update = asyncHandler(async (req, res) => {
  const projekt = await service.update(req.params.id, req.body, req.user.id);
  res.json(projekt);
});

export const remove = asyncHandler(async (req, res) => {
  await service.softDelete(req.params.id, req.user.id);
  res.json({ message: 'Projekt in Papierkorb verschoben.' });
});
