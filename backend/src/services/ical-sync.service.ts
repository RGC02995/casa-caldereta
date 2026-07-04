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

      activeUids.push(component.uid);
      await blockedPeriodService.upsertExternal(
        platform.origin,
        component.uid,
        component.start,
        component.end,
        platform.label,
      );
    }

    const deleted = await blockedPeriodService.deleteStaleExternal(platform.origin, activeUids);
    console.log(`[ical-sync] ${platform.label}: ${activeUids.length} eventos activos, ${deleted} bloqueos eliminados`);
  }
}

export const icalSyncService = new IcalSyncService();
