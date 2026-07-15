/**
 * Genera el catálogo de municipios españoles con su código INE de 5 dígitos.
 * Fuente: dataset abierto "codeforspain/ds-organizacion-administrativa", que el propio
 * repositorio declara construido a partir de los datos oficiales del INE
 * (ine.es/daco/daco42/codmun). No se inventa ni transcribe a mano ningún código.
 *
 * Verificado manualmente antes de generar el fichero final: "Aielo de Rugat"
 * (municipio donde está Casa Caldereta) aparece con municipio_id "46043" y
 * provincia_id "46" = "Valencia/València", que son los valores reales conocidos.
 *
 * Uso: node scripts/build-municipios-json.js
 * Escribe: frontend/src/assets/data/municipios-ine.json ({codigo, nombre, provincia})
 */
const fs = require('fs');
const path = require('path');

const MUNICIPIOS_URL  = 'https://raw.githubusercontent.com/codeforspain/ds-organizacion-administrativa/master/data/municipios.json';
const PROVINCIAS_URL  = 'https://raw.githubusercontent.com/codeforspain/ds-organizacion-administrativa/master/data/provincias.json';

async function main() {
  const [municipiosRes, provinciasRes] = await Promise.all([
    fetch(MUNICIPIOS_URL),
    fetch(PROVINCIAS_URL),
  ]);
  if (!municipiosRes.ok) throw new Error(`No se pudo descargar municipios.json: ${municipiosRes.status}`);
  if (!provinciasRes.ok) throw new Error(`No se pudo descargar provincias.json: ${provinciasRes.status}`);

  const municipios = await municipiosRes.json();
  const provincias = await provinciasRes.json();

  const provinciaNombrePorId = new Map(provincias.map(p => [p.provincia_id, p.nombre]));

  const salida = municipios
    .map(m => ({
      codigo: m.municipio_id,
      nombre: m.nombre,
      provincia: provinciaNombrePorId.get(m.provincia_id) ?? m.provincia_id,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  // Comprobación de cordura: Aielo de Rugat (donde está Casa Caldereta) debe existir con su código real.
  const aielo = salida.find(m => m.nombre === 'Aielo de Rugat');
  if (!aielo || aielo.codigo !== '46043') {
    throw new Error(`Comprobación de cordura fallida: "Aielo de Rugat" no tiene el código INE esperado (46043). Encontrado: ${JSON.stringify(aielo)}`);
  }

  const outPath = path.join(__dirname, '../../frontend/src/assets/data/municipios-ine.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  // Sin indentar: es un asset de datos que se descarga en el navegador, no un fichero para leer a mano.
  fs.writeFileSync(outPath, JSON.stringify(salida), 'utf-8');

  console.log(`✔ ${salida.length} municipios escritos en ${outPath}`);
  console.log(`  Comprobación de cordura OK: Aielo de Rugat -> ${aielo.codigo}`);
}

main().catch(err => {
  console.error('✘ Error generando municipios-ine.json:', err.message);
  process.exit(1);
});
