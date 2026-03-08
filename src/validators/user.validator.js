import Joi from 'joi';

export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  name: Joi.string().min(1).max(255).required(),
  role: Joi.string().valid('admin', 'editor', 'viewer').default('viewer'),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  name: Joi.string().min(1).max(255),
  role: Joi.string().valid('admin', 'editor', 'viewer'),
  password: Joi.string().min(8).max(72),
}).min(1);
