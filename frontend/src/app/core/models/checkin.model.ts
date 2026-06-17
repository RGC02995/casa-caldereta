export type TipoDocumento = 'DNI' | 'NIE' | 'Pasaporte' | 'Permiso de residencia' | 'Otro';
export type Sexo = 'H' | 'M';

export interface ICheckinSettings {
  readonly id:           string;
  readonly checkInTime:  string;
  readonly checkOutTime: string;
}

export interface ITodayBookingItem {
  readonly id:           string;
  readonly guestName:    string;
  readonly checkIn:      string;
  readonly checkOut:     string;
  readonly guests:       number;
  readonly checkedInAt?:  string;
  readonly checkedOutAt?: string;
}

export interface ITodayActivity {
  readonly checkIns:  ITodayBookingItem[];
  readonly checkOuts: ITodayBookingItem[];
}

export interface ITravelerDocument {
  readonly id:              string;
  readonly bookingId:       string;
  readonly tipoDocumento:   TipoDocumento;
  readonly numDocumento:    string;
  readonly numSoporte?:     string;
  readonly apellido1:       string;
  readonly apellido2?:      string;
  readonly nombre:          string;
  readonly sexo:            Sexo;
  readonly fechaNacimiento: string;
  readonly pais:            string;
  readonly paisResidencia?: string;
  readonly fechaEntrada:    string;
}

export interface ICheckinFormInfo {
  readonly bookingId:        string;
  readonly guestName:        string;
  readonly checkIn:          string;
  readonly checkOut:         string;
  readonly guests:           number;
  readonly checkInTime:      string;
  readonly checkOutTime:     string;
  readonly alreadySubmitted: boolean;
}

export interface ITravelerInput {
  tipoDocumento:   TipoDocumento;
  numDocumento:    string;
  numSoporte?:     string;
  apellido1:       string;
  apellido2?:      string;
  nombre:          string;
  sexo:            Sexo;
  fechaNacimiento: string;
  pais:            string;
  paisResidencia?: string;
}
