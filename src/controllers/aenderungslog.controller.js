import * as service from '../services/aenderungslog.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const { aktion, entitaet, limit, offset } = req.query;
  const result = await service.getAll({
    aktion,
    entitaet,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json(result);
});
