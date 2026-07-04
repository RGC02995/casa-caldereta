/**
 * Script de un solo uso — rellena origin: 'manual' en los periodos bloqueados
 * existentes que no tengan ese campo (creados antes de añadirlo al modelo).
 *
 * Uso: node backend/scripts/migrate-blocked-period-origin.js
 */
require('dotenv/config');
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI no está definida (revisa backend/.env).');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✔ Conectado a MongoDB');

  const collection = mongoose.connection.collection('blockedperiods');

  const toUpdate = await collection.countDocuments({ origin: { $exists: false } });
  console.log(`Documentos sin campo "origin": ${toUpdate}`);

  if (toUpdate === 0) {
    console.log('Nada que migrar.');
  } else {
    const result = await collection.updateMany(
      { origin: { $exists: false } },
      { $set: { origin: 'manual' } },
    );
    console.log(`✔ Actualizados ${result.modifiedCount} documentos con origin: 'manual'`);
  }

  await mongoose.disconnect();
  console.log('✔ Desconectado');
}

main().catch((error) => {
  console.error('✖ Error en la migración:', error);
  process.exit(1);
});
