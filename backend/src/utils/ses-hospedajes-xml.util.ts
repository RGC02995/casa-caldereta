import { IBookingDocument } from '../models/booking.model';
import { ITravelerDocumentDoc } from '../models/traveler-document.model';
import { ICheckinSettingsDocument } from '../models/checkin-settings.model';

// ─── Datos del establecimiento ──────────────────────────────────────────────────
// Código asignado por el Sistema de Hospedajes (hospedajes.ses.mir.es) al dar de
// alta el establecimiento — trámite distinto de la licencia turística autonómica
// CV-VUT0058371-V, que no se emite en este XML.

const CODIGO_ESTABLECIMIENTO = '0000377329';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function xmlDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10); // AAAA-MM-DD
}

function xmlDateTime(date: Date, hhmm: string): string {
  const [hh, mm] = hhmm.split(':');
  return `${xmlDateOnly(date)}T${hh}:${mm}:00`; // AAAA-MM-DDThh:mm:ss
}

function tag(name: string, value: string | undefined | null, indent = 8): string {
  const pad = ' '.repeat(indent);
  if (!value) return `${pad}<${name}/>`;
  return `${pad}<${name}>${escapeXml(value)}</${name}>`;
}

// ─── Generación del XML ─────────────────────────────────────────────────────────
//
// Estructura conforme al esquema oficial "Partes de viajeros" (apartado 3 de
// "Instrucciones para el alta masiva de comunicaciones — Hospedajes v1.2.0",
// Ministerio del Interior, RD 933/2021), verificado campo a campo contra ese
// documento el 2026-07-16. Bloques comunes "direccion" (7.1) y "pago" (7.2)
// también verificados contra el mismo documento.

export function generateSesHospedajesXml(
  booking: IBookingDocument,
  travelers: ITravelerDocumentDoc[],
  settings: ICheckinSettingsDocument,
): string {
  const referencia = `CC-${String(booking._id).slice(-6).toUpperCase()}`;
  const fechaContrato = xmlDateOnly(new Date(booking.createdAt));
  const fechaEntrada = xmlDateTime(new Date(booking.checkIn), settings.checkInTime);
  const fechaSalida = xmlDateTime(new Date(booking.checkOut), settings.checkOutTime);

  const fechaPagoDate = booking.remainingPaidAt ?? booking.depositPaidAt;
  const pagoXml = [
    tag('tipoPago', 'PLATF', 10),
    fechaPagoDate ? tag('fechaPago', xmlDateOnly(new Date(fechaPagoDate)), 10) : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  const personasXml = travelers
    .map((viajero) => {
      const direccionXml = [
        tag('direccion', viajero.direccionResidencia, 10),
        viajero.paisResidencia === 'ESP'
          ? tag('codigoMunicipio', viajero.codigoMunicipio, 10)
          : tag('nombreMunicipio', viajero.nombreMunicipio, 10),
        tag('codigoPostal', viajero.codigoPostal, 10),
        tag('pais', viajero.paisResidencia, 10),
      ].join('\n');

      return `      <persona>
${tag('rol', 'VI')}
${tag('nombre', viajero.nombre)}
${tag('apellido1', viajero.apellido1)}
${tag('apellido2', viajero.apellido2)}
${tag('tipoDocumento', viajero.tipoDocumento)}
${tag('numeroDocumento', viajero.numDocumento)}
${tag('soporteDocumento', viajero.numSoporte)}
${tag('fechaNacimiento', xmlDateOnly(new Date(viajero.fechaNacimiento)))}
${tag('nacionalidad', viajero.pais)}
${tag('sexo', viajero.sexo)}
        <direccion>
${direccionXml}
        </direccion>
${tag('telefono', viajero.telefono)}
${tag('correo', viajero.correo)}
${tag('parentesco', viajero.parentesco)}
      </persona>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!--
  Generado conforme al esquema oficial de "Partes de viajeros" (SES.HOSPEDAJES,
  Ministerio del Interior, RD 933/2021, Instrucciones v1.2.0). Revisa los datos
  antes de subirlo al portal — esta verificación es documental, no ha sido
  validada contra el portal real con una comunicación de prueba.
-->
<peticion>
  <solicitud>
    <codigoEstablecimiento>${escapeXml(CODIGO_ESTABLECIMIENTO)}</codigoEstablecimiento>
    <comunicacion>
      <contrato>
        <referencia>${escapeXml(referencia)}</referencia>
        <fechaContrato>${fechaContrato}</fechaContrato>
        <fechaEntrada>${fechaEntrada}</fechaEntrada>
        <fechaSalida>${fechaSalida}</fechaSalida>
        <numPersonas>${travelers.length}</numPersonas>
        <pago>
${pagoXml}
        </pago>
      </contrato>
${personasXml}
    </comunicacion>
  </solicitud>
</peticion>
`;
}
