import { v2 as cloudinary } from 'cloudinary';
import { env } from './environment';

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key:    env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
  secure:     true,
});

export { cloudinary };
