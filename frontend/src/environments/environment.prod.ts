export const environment = {
  production: true,
  // ⚠️ PASO 1: desplegar backend en Railway → copiar la URL generada aquí
  // Ejemplo sin dominio: 'https://casa-caldereta-backend-production.up.railway.app/api/v1'
  // Ejemplo con dominio: 'https://api.casa-caldereta.com/api/v1'
  apiUrl: 'https://backend-production-d85c.up.railway.app/api/v1',
  cloudinaryCloudName: '',
  cloudinaryUploadPreset: '',
  appName: 'Casa Caldereta',
  defaultLanguage: 'es',
  supportedLanguages: ['es', 'en'],
} as const;
