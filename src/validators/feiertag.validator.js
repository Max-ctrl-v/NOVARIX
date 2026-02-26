import Joi from 'joi';

export const createFeiertagSchema = Joi.object({
  datum: Joi.string().isoDate().required().messages({
    'any.required': 'Datum ist erforderlich.',
  }),
  name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Feiertags-Name ist erforderlich.',
  }),
});
