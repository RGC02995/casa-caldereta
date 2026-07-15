import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface IPaisOption {
  readonly code: string;
  readonly name: string;
}

export interface IMunicipioOption {
  readonly codigo:    string;
  readonly nombre:    string;
  readonly provincia: string;
}

@Injectable({ providedIn: 'root' })
export class GeoReferenceService {
  private readonly http = inject(HttpClient);

  private paises$?:     Observable<IPaisOption[]>;
  private municipios$?: Observable<IMunicipioOption[]>;

  // Catálogo de ~195 países (ISO 3166-1 Alfa-3). Cacheado en memoria tras la primera petición.
  getPaises(): Observable<IPaisOption[]> {
    this.paises$ ??= this.http
      .get<IPaisOption[]>('assets/data/paises-iso3166.json')
      .pipe(shareReplay(1));
    return this.paises$;
  }

  // Catálogo de ~8.131 municipios españoles (código INE). Solo se pide cuando hace
  // falta (país de residencia = España), no se precarga en cada carga del formulario.
  getMunicipios(): Observable<IMunicipioOption[]> {
    this.municipios$ ??= this.http
      .get<IMunicipioOption[]>('assets/data/municipios-ine.json')
      .pipe(shareReplay(1));
    return this.municipios$;
  }
}
