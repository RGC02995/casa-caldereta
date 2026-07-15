import { Document, Model, Schema, Types, model } from 'mongoose';

export type TipoDocumento = 'NIF' | 'NIE' | 'PAS' | 'OTRO';
export type Sexo = 'H' | 'M' | 'O';

export interface ITravelerDocumentDoc extends Document {
  bookingId:            Types.ObjectId;
  tipoDocumento:        TipoDocumento;
  numDocumento:         string;
  numSoporte:           string;
  apellido1:            string;
  apellido2?:           string;       // obligatorio solo si tipoDocumento === 'NIF'
  nombre:               string;
  sexo?:                Sexo;
  fechaNacimiento:      Date;
  parentesco?:          string;
  pais:                 string;       // nacionalidad, código ISO 3166-1 Alfa-3
  paisResidencia:       string;       // código ISO 3166-1 Alfa-3
  nombreMunicipio?:     string;       // obligatorio si paisResidencia !== 'ESP'
  codigoMunicipio?:     string;       // código INE de 5 dígitos, obligatorio si paisResidencia === 'ESP'
  direccionResidencia:  string;
  codigoPostal:         string;
  telefono?:            string;       // uno de telefono/correo es obligatorio
  correo?:              string;       // uno de telefono/correo es obligatorio
  fechaEntrada:         Date;
  /** @deprecated sustituido por nombreMunicipio/codigoMunicipio. Se conserva para registros anteriores. */
  ciudadResidencia?:    string;
  /** @deprecated sustituido por telefono/correo. Se conserva para registros anteriores. */
  contacto?:            string;
  createdAt:            Date;
  updatedAt:            Date;
}

const travelerDocumentSchema = new Schema<ITravelerDocumentDoc>(
  {
    bookingId: {
      type:     Schema.Types.ObjectId,
      ref:      'Booking',
      required: true,
      index:    true,
    },
    tipoDocumento: {
      type:     String,
      enum:     ['NIF', 'NIE', 'PAS', 'OTRO'] as TipoDocumento[],
      required: true,
    },
    numDocumento: {
      type:      String,
      required:  true,
      trim:      true,
      uppercase: true,
      maxlength: 50,
    },
    numSoporte: {
      type:      String,
      required:  true,
      trim:      true,
      uppercase: true,
      maxlength: 20,
    },
    apellido1: { type: String, required: true, trim: true, maxlength: 80 },
    apellido2: {
      type:      String,
      trim:      true,
      maxlength: 80,
      required: [
        function (this: ITravelerDocumentDoc) { return this.tipoDocumento === 'NIF'; },
        'El segundo apellido es obligatorio cuando el tipo de documento es NIF.',
      ],
    },
    nombre: { type: String, required: true, trim: true, maxlength: 80 },
    sexo: {
      type: String,
      enum: ['H', 'M', 'O'] as Sexo[],
    },
    fechaNacimiento: {
      type:     Date,
      required: true,
      validate: {
        validator: (value: Date) => value <= new Date(),
        message:   'La fecha de nacimiento no puede ser una fecha futura.',
      },
    },
    parentesco:      { type: String, trim: true, maxlength: 60 },
    pais:            { type: String, required: true, trim: true, maxlength: 3 },
    paisResidencia:  { type: String, required: true, trim: true, maxlength: 3 },
    nombreMunicipio: {
      type:      String,
      trim:      true,
      maxlength: 100,
      required: [
        function (this: ITravelerDocumentDoc) { return this.paisResidencia !== 'ESP'; },
        'El nombre del municipio de residencia es obligatorio si el país de residencia no es España.',
      ],
    },
    codigoMunicipio: {
      type:      String,
      trim:      true,
      match:     /^\d{5}$/,
      required: [
        function (this: ITravelerDocumentDoc) { return this.paisResidencia === 'ESP'; },
        'El código de municipio (INE) es obligatorio si el país de residencia es España.',
      ],
    },
    direccionResidencia: { type: String, required: true, trim: true, maxlength: 200 },
    codigoPostal:         { type: String, required: true, trim: true, maxlength: 20 },
    telefono: {
      type:      String,
      trim:      true,
      maxlength: 30,
      required: [
        function (this: ITravelerDocumentDoc) { return !this.correo; },
        'Debes indicar un teléfono o un correo electrónico.',
      ],
    },
    correo: {
      type:      String,
      trim:      true,
      lowercase: true,
      maxlength: 120,
      required: [
        function (this: ITravelerDocumentDoc) { return !this.telefono; },
        'Debes indicar un teléfono o un correo electrónico.',
      ],
    },
    fechaEntrada: { type: Date, required: true },
    // Campos obsoletos: opcionales, se mantienen solo para no invalidar registros anteriores a este cambio.
    ciudadResidencia: { type: String, trim: true, maxlength: 100 },
    contacto:         { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

export const TravelerDocumentModel: Model<ITravelerDocumentDoc> =
  model<ITravelerDocumentDoc>('TravelerDocument', travelerDocumentSchema);
