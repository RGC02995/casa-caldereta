import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'truncate', pure: true })
export class TruncatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    charLimit = 100,
    trail = '...'
  ): string {
    if (!value) return '';
    if (value.length <= charLimit) return value;
    return value.slice(0, charLimit).trimEnd() + trail;
  }
}
