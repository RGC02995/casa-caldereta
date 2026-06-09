import { Document, Model, Schema, model } from 'mongoose';

export interface IRefreshTokenDocument extends Document {
  token:         string;
  sub:           string;
  expiresAt:     Date;
  userAgentHash: string;
}

const refreshTokenSchema = new Schema<IRefreshTokenDocument>(
  {
    token:         { type: String, required: true, unique: true },
    sub:           { type: String, required: true },
    expiresAt:     { type: Date,   required: true },
    userAgentHash: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// TTL: MongoDB elimina los tokens expirados automáticamente
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel: Model<IRefreshTokenDocument> = model<IRefreshTokenDocument>(
  'RefreshToken',
  refreshTokenSchema,
);
