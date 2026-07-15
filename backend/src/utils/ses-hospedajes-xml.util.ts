import { IBookingDocument } from '../models/booking.model';
import { ITravelerDocumentDoc } from '../models/traveler-document.model';

// ─── Datos del establecimiento (fijos) ─────────────────────────────────────────
// Mismos valores que backend/src/utils/invoice.util.ts y las páginas legales.

const ESTABLISHMENT = {
  nombre:              'Casa Caldereta',
  licenciaTuristica:   'CV-VUT0058371-V',
  titular:             'Santiago Giner Giner',
  nif:                 '25422225A',
  direccion:           'Carrer de Baix, 3',
  codigoPostal:        '46842',
  municipio:            'Aielo de Rugat',
  provincia:           'Valencia',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlDate(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function tag(name: string, value: string | undefined | null): string {
  if (!value) return `      <${name}/>`;
  return `      <${name}>${escapeXml(value)}</${name}>`;
}

// ─── Generación del XML ─────────────────────────────────────────────────────────
//
// AVISO IMPORTANTE: este XML es una aproximación construida a partir de la
// documentación pública del formato de "parte de viajeros" (RD 933/2021,
// plataforma SES.HOSPEDAJES del Ministerio del Interior). No se ha contrastado
// contra el XSD/documentación técnica oficial del portal (no disponible en este
// proyecto), por lo que los nombres de etiqueta y la estructura pueden no
// coincidir exactamente con lo que exige el sistema real. Debe revisarse y
// validarse contra el esquema oficial antes de usarse para una comunicación real.
// Mientras tanto, sirve como borrador/plantilla con todos los datos ya
// disponibles, y como alternativa a copiar los datos a mano en el portal.

export function generateSesHospedajesXml(
  booking: IBookingDocument,
  travelers: ITravelerDocumentDoc[],
): string {
  const referencia = `CC-${String(booking._id).slice(-6).toUpperCase()}`;
  const fechaEntrada = xmlDate(new Date(booking.checkIn));
  const fechaSalida = xmlDate(new Date(booking.checkOut));

  const viajerosXml = travelers
    .map((viajero, index) => {
      return `    <viajero orden="${index + 1}">
${tag('nombre', viajero.nombre)}
${tag('apellido1', viajero.apellido1)}
${tag('apellido2', viajero.apellido2)}
${tag('fechaNacimiento', xmlDate(new Date(viajero.fechaNacimiento)))}
${tag('sexo', viajero.sexo)}
${tag('nacionalidad', viajero.pais)}
${tag('tipoDocumento', viajero.tipoDocumento)}
${tag('numeroDocumento', viajero.numDocumento)}
${tag('numeroSoporte', viajero.numSoporte)}
${tag('direccion', viajero.direccionResidencia)}
${tag('municipio', viajero.nombreMunicipio)}
${tag('codigoMunicipio', viajero.codigoMunicipio)}
${tag('codigoPostal', viajero.codigoPostal)}
${tag('paisResidencia', viajero.paisResidencia)}
${tag('telefono', viajero.telefono)}
${tag('correo', viajero.correo)}
${tag('parentesco', viajero.parentesco)}
    </viajero>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!--
  BORRADOR — pendiente de validar contra el esquema oficial de SES.HOSPEDAJES
  (Ministerio del Interior, RD 933/2021). Ver comentario en
  backend/src/utils/ses-hospedajes-xml.util.ts antes de usar en producción.
-->
<parteViajeros>
  <establecimiento>
    <nombre>${escapeXml(ESTABLISHMENT.nombre)}</nombre>
    <licenciaTuristica>${escapeXml(ESTABLISHMENT.licenciaTuristica)}</licenciaTuristica>
    <titular>${escapeXml(ESTABLISHMENT.titular)}</titular>
    <nif>${escapeXml(ESTABLISHMENT.nif)}</nif>
    <direccion>${escapeXml(ESTABLISHMENT.direccion)}</direccion>
    <codigoPostal>${escapeXml(ESTABLISHMENT.codigoPostal)}</codigoPostal>
    <municipio>${escapeXml(ESTABLISHMENT.municipio)}</municipio>
    <provincia>${escapeXml(ESTABLISHMENT.provincia)}</provincia>
  </establecimiento>
  <contrato>
    <referencia>${escapeXml(referencia)}</referencia>
    <fechaEntrada>${fechaEntrada}</fechaEntrada>
    <fechaSalida>${fechaSalida}</fechaSalida>
    <numPersonas>${travelers.length}</numPersonas>
  </contrato>
  <viajeros>
${viajerosXml}
  </viajeros>
</parteViajeros>
`;
}
