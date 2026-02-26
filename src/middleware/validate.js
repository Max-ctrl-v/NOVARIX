import { AppError } from './errorHandler.js';

// Joi-Validierung Wrapper
// Nutzung: validate(schema) oder validate(schema, 'query')
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,      // Alle Fehler sammeln
      stripUnknown: true,     // Unbekannte Felder entfernen
      convert: true,          // Typ-Konvertierung erlauben
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      throw new AppError('Validierungsfehler', 400, details);
    }

    // Validierte Daten zurückschreiben
    req[source] = value;
    next();
  };
}
