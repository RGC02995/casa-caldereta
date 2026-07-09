import { Document, Model, Schema, Types, model } from 'mongoose';

export type TipoDocumento = 'DNI' | 'NIE' | 'Pasaporte' | 'Permiso de residencia' | 'Otro';
export type Sexo = 'H' | 'M';

export interface ITravelerDocumentDoc extends Document {
  bookingId:            Types.ObjectId;
  tipoDocumento:        TipoDocumento;
  numDocumento:         string;
  numSoporte:           string;
  apellido1:            string;
  apellido2:            string;
  nombre:               string;
  sexo?:                Sexo;
  fechaNacimiento:      Date;
  parentesco?:          string;
  pais:                 string;       // nacionalidad
  paisResidencia:       string;
  ciudadResidencia:     string;
  direccionResidencia:  string;
  codigoPostal:         string;
  contacto:             string;       // teléfono o email
  fechaEntrada:         Date;
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
      enum:     ['DNI', 'NIE', 'Pasaporte', 'Permiso de residencia', 'Otro'] as TipoDocumento[],
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
    apellido2: { type: String, required: true, trim: true, maxlength: 80 },
    nombre:    { type: String, required: true, trim: true, maxlength: 80 },
    sexo: {
      type: String,
      enum: ['H', 'M'] as Sexo[],
    },
    fechaNacimiento: {
      type:     Date,
      required: true,
      validate: {
        validator: (value: Date) => value <= new Date(),
        message:   'La fecha de nacimiento no puede ser una fecha futura.',
      },
    },
    parentesco:          { type: String, trim: true, maxlength: 60 },
    pais:                { type: String, required: true, trim: true, maxlength: 60 },
    paisResidencia:      { type: String, required: true, trim: true, maxlength: 60 },
    ciudadResidencia:    { type: String, required: true, trim: true, maxlength: 100 },
    direccionResidencia: { type: String, required: true, trim: true, maxlength: 200 },
    codigoPostal:        { type: String, required: true, trim: true, maxlength: 20 },
    contacto:            { type: String, required: true, trim: true, maxlength: 120 },
    fechaEntrada:        { type: Date,   required: true },
  },
  { timestamps: true },
);

export const TravelerDocumentModel: Model<ITravelerDocumentDoc> =
  model<ITravelerDocumentDoc>('TravelerDocument', travelerDocumentSchema);
