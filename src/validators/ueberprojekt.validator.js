import Joi from 'joi';

export const createUeberProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'any.required': 'Firmenname ist erforderlich.',
  }),
  beschreibung: Joi.string().allow('', null),
  unternehmensTyp: Joi.string().valid('grossunternehmen', 'kmu').required().messages({
    'any.only': 'Unternehmenstyp muss "grossunternehmen" oder "kmu" sein.',
    'any.required': 'Unternehmenstyp ist erforderlich.',
  }),
});

export const updateUeberProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  beschreibung: Joi.string().allow('', null),
  unternehmensTyp: Joi.string().valid('grossunternehmen', 'kmu'),
  updatedAt: Joi.string().isoDate(), // Für Optimistic Locking
  version: Joi.number().integer(),
}).min(1);
