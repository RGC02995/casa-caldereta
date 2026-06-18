import { Pipe, PipeTransform } from '@angular/core';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

@Pipe({ name: 'dateFormat', pure: true })
export class DateFormatPipe implements PipeTransform {
  transform(
    value: Date | string | number | null | undefined,
    dateFormat = 'dd/MM/yyyy'
  ): string {
    if (value === null || value === undefined) return '';

    const parsedDate = typeof value === 'string' ? parseISO(value) : new Date(value);

    if (!isValid(parsedDate)) return '';

    return format(parsedDate, dateFormat, { locale: es });
  }
}
