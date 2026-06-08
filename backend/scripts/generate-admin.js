/**
 * Genera el hash bcrypt de la contraseña del administrador.
 * Uso: node scripts/generate-admin.js <contraseña>
 * Copia el resultado en backend/.env como ADMIN_PASSWORD_HASH
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password || password.length < 8) {
  console.error('\nError: proporciona una contraseña de al menos 8 caracteres.');
  console.error('Uso: node scripts/generate-admin.js <contraseña>\n');
  process.exit(1);
}

bcrypt.hash(password, 12).then(hash => {
  console.log('\n✔ Hash generado correctamente.');
  console.log('\nCopia esta línea en tu backend/.env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\nIMPORTANTE: no guardes la contraseña en texto plano en ningún fichero.\n');
});
