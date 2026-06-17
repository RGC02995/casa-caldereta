import { Document, Model, Schema, model } from 'mongoose';

export interface ICheckinSettingsDocument extends Document {
  checkInTime:  string;  // "HH:MM" — hora de entrada (p.ej. "16:00")
  checkOutTime: string;  // "HH:MM" — hora de salida  (p.ej. "11:00")
  updatedAt:    Date;
}

const checkinSettingsSchema = new Schema<ICheckinSettingsDocument>(
  {
    checkInTime: {
      type:     String,
      required: true,
      default:  '16:00',
      match:    [/^\d{2}:\d{2}$/, 'Formato de hora no válido (HH:MM)'],
    },
    checkOutTime: {
      type:     String,
      required: true,
      default:  '11:00',
      match:    [/^\d{2}:\d{2}$/, 'Formato de hora no válido (HH:MM)'],
    },
  },
  { timestamps: true },
);

export const CheckinSettingsModel: Model<ICheckinSettingsDocument> =
  model<ICheckinSettingsDocument>('CheckinSettings', checkinSettingsSchema);
