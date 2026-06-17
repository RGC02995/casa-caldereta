import { Document, Model, Schema, Types, model } from 'mongoose';

export type TipoDocumento = 'DNI' | 'NIE' | 'Pasaporte' | 'Permiso de residencia' | 'Otro';
export type Sexo = 'H' | 'M';

export interface ITravelerDocumentDoc extends Document {
  bookingId:       Types.ObjectId;
  tipoDocumento:   TipoDocumento;
  numDocumento:    string;
  numSoporte?:     string;       // número de soporte (DNI español)
  apellido1:       string;
  apellido2?:      string;
  nombre:          string;
  sexo:            Sexo;
  fechaNacimiento: Date;
  pais:            string;       // nacionalidad
  paisResidencia?: string;
  fechaEntrada:    Date;         // automático — checkIn de la reserva
  createdAt:       Date;
  updatedAt:       Date;
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
      trim:      true,
      uppercase: true,
      maxlength: 20,
    },
    apellido1: { type: String, required: true, trim: true, maxlength: 80 },
    apellido2: { type: String, trim: true, maxlength: 80 },
    nombre:    { type: String, required: true, trim: true, maxlength: 80 },
    sexo:      {
      type:     String,
      enum:     ['H', 'M'] as Sexo[],
      required: true,
    },
    fechaNacimiento: { type: Date, required: true },
    pais:            { type: String, required: true, trim: true, maxlength: 60 },
    paisResidencia:  { type: String, trim: true, maxlength: 60 },
    fechaEntrada:    { type: Date, required: true },
  },
  { timestamps: true },
);

export const TravelerDocumentModel: Model<ITravelerDocumentDoc> =
  model<ITravelerDocumentDoc>('TravelerDocument', travelerDocumentSchema);
