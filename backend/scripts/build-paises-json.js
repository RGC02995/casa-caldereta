/**
 * Genera el catálogo de países (código ISO 3166-1 Alfa-3 + nombre en español)
 * a partir del paquete "i18n-iso-countries" (fuente estándar ISO, no inventada).
 * Uso: node scripts/build-paises-json.js
 * Escribe:
 *   - frontend/src/assets/data/paises-iso3166.json (usado por el formulario)
 *   - backend/src/data/iso-3166-1-alpha3.ts (usado para validar/resolver en el servidor)
 */
const fs = require('fs');
const path = require('path');
const countries = require('i18n-iso-countries');
countries.registerLocale(require('i18n-iso-countries/langs/es.json'));

const names = countries.getNames('es', { select: 'official' });

const paises = Object.entries(names)
  .map(([alpha2, name]) => ({ code: countries.alpha2ToAlpha3(alpha2), name }))
  .filter(p => p.code)
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const frontendPath = path.join(__dirname, '../../frontend/src/assets/data/paises-iso3166.json');
fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
// Sin indentar: es un asset de datos que se descarga en el navegador, no un fichero para leer a mano.
fs.writeFileSync(frontendPath, JSON.stringify(paises), 'utf-8');

const backendTs = `// Generado con backend/scripts/build-paises-json.js — fuente: paquete "i18n-iso-countries" (ISO 3166-1).
// No editar a mano; volver a ejecutar el script si hace falta regenerar.

export interface IPaisIso {
  readonly code: string;
  readonly name: string;
}

export const PAISES_ISO_3166: readonly IPaisIso[] = ${JSON.stringify(paises, null, 2)};

export const PAISES_ISO_CODES: ReadonlySet<string> = new Set(PAISES_ISO_3166.map(p => p.code));
`;
const backendPath = path.join(__dirname, '../src/data/iso-3166-1-alpha3.ts');
fs.mkdirSync(path.dirname(backendPath), { recursive: true });
fs.writeFileSync(backendPath, backendTs, 'utf-8');

console.log(`✔ ${paises.length} países escritos en:`);
console.log(`  - ${frontendPath}`);
console.log(`  - ${backendPath}`);
