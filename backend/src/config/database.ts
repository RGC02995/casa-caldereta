import mongoose from 'mongoose';
import { env } from './environment';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log('✔ MongoDB conectado');
  } catch (error) {
    console.error('✖ Error conectando a MongoDB:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () =>
    console.warn('MongoDB desconectado')
  );
  mongoose.connection.on('reconnected', () =>
    console.log('MongoDB reconectado')
  );
}
