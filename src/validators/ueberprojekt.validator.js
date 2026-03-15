import Joi from 'joi';

const kommandistSchema = Joi.object({
  id: Joi.string().uuid().allow(null, ''),
  name: Joi.string().min(1).max(255).required(),
  anteilProzent: Joi.number().min(0).max(100).required(),
});

export const createUeberProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Firmenname ist erforderlich.',
  }),
  beschreibung: Joi.string().allow('', null),
  unternehmensTyp: Joi.string().valid('grossunternehmen', 'kmu').required().messages({
    'any.only': 'Unternehmenstyp muss "grossunternehmen" oder "kmu" sein.',
    'any.required': 'Unternehmenstyp ist erforderlich.',
  }),
  rechtsform: Joi.string().valid('gmbh', 'gmbh_co_kg').default('gmbh'),
  kommandisten: Joi.array().items(kommandistSchema),
});

export const updateUeberProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  beschreibung: Joi.string().allow('', null),
  unternehmensTyp: Joi.string().valid('grossunternehmen', 'kmu'),
  rechtsform: Joi.string().valid('gmbh', 'gmbh_co_kg'),
  kommandisten: Joi.array().items(kommandistSchema),
  updatedAt: Joi.string().isoDate(), // Für Optimistic Locking
  version: Joi.number().integer(),
}).min(1);
