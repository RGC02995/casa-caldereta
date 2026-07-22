import * as ical from 'node-ical';
import { env } from '../config/environment';
import { BlockedPeriodOrigin } from '../models/blocked-period.model';
import { blockedPeriodService } from './blocked-period.service';

interface IPlatformConfig {
  origin: BlockedPeriodOrigin;
  url:    string;
  label:  string;
}

function getConfiguredPlatforms(): IPlatformConfig[] {
  const platforms: IPlatformConfig[] = [];
  if (env.airbnbIcalUrl)  platforms.push({ origin: 'airbnb',  url: env.airbnbIcalUrl,  label: 'Airbnb' });
  if (env.bookingIcalUrl) platforms.push({ origin: 'booking', url: env.bookingIcalUrl, label: 'Booking.com' });
  return platforms;
}

// node-ical construye estas fechas con el Date(y, m, d) nativo, interpretado en la hora
// LOCAL del proceso — sin normalizar, el día visible cambiaría según el TZ del servidor.
// Solo aplica a datetype 'date' (fechas sin hora, como vienen Airbnb/Booking); una
// DATE-TIME real (con hora y TZID propios) no debe tocarse.
function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

class IcalSyncService {
  async syncAll(): Promise<void> {
    const platforms = getConfiguredPlatforms();

    for (const platform of platforms) {
      try {
        await this.syncPlatform(platform);
      } catch (error) {
        console.error(
          `[ical-sync] Error sincronizando ${platform.label}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  private async syncPlatform(platform: IPlatformConfig): Promise<void> {
    const events = await ical.async.fromURL(platform.url);

    // Un iCal válido, incluso sin eventos, siempre incluye un componente VCALENDAR.
    // Su ausencia indica que la respuesta (p. ej. HTTP 200 con una página de
    // mantenimiento) no es un feed real — abortamos para no borrar bloqueos vigentes.
    const hasValidCalendar = Object.values(events).some(component => component?.type === 'VCALENDAR');
    if (!hasValidCalendar) {
      throw new Error(`Feed de ${platform.label} no es un iCal válido`);
    }

    const activeUids: string[] = [];

    for (const component of Object.values(events)) {
      if (!component || component.type !== 'VEVENT') continue;
      if (!component.uid || !component.start || !component.end) continue;

      const isDateOnly = component.datetype === 'date';
      const start = isDateOnly ? toUtcMidnight(component.start) : component.start;
      const end   = isDateOnly ? toUtcMidnight(component.end)   : component.end;

      activeUids.push(component.uid);
      await blockedPeriodService.upsertExternal(
        platform.origin,
        component.uid,
        start,
        end,
        platform.label,
      );
    }

    // Un feed con VCALENDAR válido pero 0 VEVENTs es indistinguible, desde aquí, de un
    // fallo temporal del proveedor (rate limiting, hiccup puntual...) devolviendo un
    // calendario "vacío pero válido" en vez de un error HTTP. $nin de un array vacío no
    // excluye nada — un deleteMany aquí borraría TODOS los bloqueos vigentes de la
    // plataforma. Ante la duda, no borrar: se omite el borrado y se avisa; si la próxima
    // sync trae ≥1 evento activo, los bloqueos realmente obsoletos se limpian igual.
    if (activeUids.length === 0) {
      console.warn(`[ical-sync] ${platform.label}: 0 eventos activos — se omite el borrado de bloqueos existentes por seguridad`);
      return;
    }

    const deleted = await blockedPeriodService.deleteStaleExternal(platform.origin, activeUids);
    console.log(`[ical-sync] ${platform.label}: ${activeUids.length} eventos activos, ${deleted} bloqueos eliminados`);
  }
}

export const icalSyncService = new IcalSyncService();
