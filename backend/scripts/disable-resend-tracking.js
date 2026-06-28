/**
 * Script de un solo uso — deshabilita click tracking y open tracking
 * en el dominio casa-caldereta.com de Resend.
 *
 * Uso: RESEND_API_KEY=re_xxx node backend/scripts/disable-resend-tracking.js
 */

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('ERROR: define RESEND_API_KEY antes de ejecutar este script.');
  process.exit(1);
}

const resend = new Resend(apiKey);
const TARGET = 'casa-caldereta.com';

async function main() {
  const { data: domains, error: listError } = await resend.domains.list();
  if (listError) { console.error('Error al listar dominios:', listError.message); process.exit(1); }

  const domain = domains?.data?.find(d => d.name === TARGET);
  if (!domain) {
    console.error(`Dominio "${TARGET}" no encontrado. Dominios disponibles:`, domains?.data?.map(d => d.name));
    process.exit(1);
  }

  console.log(`Dominio encontrado: ${domain.name} (id: ${domain.id})`);
  console.log(`  click_tracking actual : ${domain.click_tracking}`);
  console.log(`  open_tracking actual  : ${domain.open_tracking}`);

  const { error: updateError } = await resend.domains.update({
    id:            domain.id,
    clickTracking: false,
    openTracking:  false,
  });

  if (updateError) { console.error('Error al actualizar:', updateError.message); process.exit(1); }

  console.log('✓ Tracking deshabilitado correctamente.');
}

main();
