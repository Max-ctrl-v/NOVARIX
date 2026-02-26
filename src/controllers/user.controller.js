import * as userService from '../services/user.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const users = await userService.getAll();
  res.json(users);
});

export const getById = asyncHandler(async (req, res) => {
  const user = await userService.getById(req.params.id);
  res.json(user);
});

export const create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body, req.user.id);
  res.status(201).json(user);
});

export const update = asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body, req.user.id);
  res.json(user);
});

export const remove = asyncHandler(async (req, res) => {
  await userService.remove(req.params.id, req.user.id);
  res.json({ message: 'Benutzer gelöscht.' });
});
