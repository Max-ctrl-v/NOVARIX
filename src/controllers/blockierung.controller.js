import * as service from '../services/blockierung.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getByMitarbeiter = asyncHandler(async (req, res) => {
  const blockierungen = await service.getByMitarbeiter(req.params.mid);
  res.json(blockierungen);
});

export const create = asyncHandler(async (req, res) => {
  const blockierung = await service.create(req.params.mid, req.body, req.user.id);
  res.status(201).json(blockierung);
});

export const update = asyncHandler(async (req, res) => {
  const blockierung = await service.update(req.params.id, req.body, req.user.id);
  res.json(blockierung);
});

export const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id);
  res.json({ message: 'Blockierung gelöscht.' });
});
