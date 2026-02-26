import Joi from 'joi';

export const registerExportSchema = Joi.object({
  typ: Joi.string().valid('projekt', 'mitarbeiter', 'ueberprojekt', 'aenderungsprotokoll').required(),
  referenzId: Joi.string().uuid().allow(null),
  zeitraumVon: Joi.string().isoDate().allow(null),
  zeitraumBis: Joi.string().isoDate().allow(null),
  exportData: Joi.any(), // Die exportierten Daten für Hash-Berechnung
});
