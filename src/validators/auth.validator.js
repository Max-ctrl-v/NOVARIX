import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Bitte eine gültige E-Mail-Adresse eingeben.',
    'any.required': 'E-Mail ist erforderlich.',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Passwort muss mindestens 8 Zeichen lang sein.',
    'any.required': 'Passwort ist erforderlich.',
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Aktuelles Passwort ist erforderlich.',
  }),
  newPassword: Joi.string().min(8).required().messages({
    'string.min': 'Neues Passwort muss mindestens 8 Zeichen lang sein.',
    'any.required': 'Neues Passwort ist erforderlich.',
  }),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().optional(), // Token comes from HttpOnly cookie; body is fallback
});
