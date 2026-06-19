import { Pipe, PipeTransform } from '@angular/core';

const WIDTHS = [400, 800, 1200, 1600] as const;

@Pipe({ name: 'cloudinarySrcset', standalone: true })
export class CloudinarySrcsetPipe implements PipeTransform {
  transform(url: string | null | undefined, format: 'srcset' | 'src' = 'srcset'): string {
    if (!url) return '';

    // Solo transforma URLs de Cloudinary. Otras URLs se devuelven sin cambios.
    if (!url.includes('res.cloudinary.com')) {
      return format === 'srcset' ? '' : url;
    }

    // Inserta parámetros de transformación antes del nombre del fichero.
    // Ejemplo: .../upload/v123/foto.jpg → .../upload/w_800,f_auto,q_auto/v123/foto.jpg
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return format === 'srcset' ? '' : url;

    const base    = url.slice(0, uploadIndex + 8); // incluye '/upload/'
    const rest    = url.slice(uploadIndex + 8);

    if (format === 'src') {
      return `${base}w_800,f_auto,q_auto/${rest}`;
    }

    return WIDTHS
      .map(w => `${base}w_${w},f_auto,q_auto/${rest} ${w}w`)
      .join(', ');
  }
}
