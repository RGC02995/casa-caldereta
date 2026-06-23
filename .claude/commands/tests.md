# /tests — Suite de tests completa + ciclo de corrección

Flujo de trabajo de testing para Casa Caldereta: escribe los tests si no existen, los ejecuta,
genera una lista de fallos, espera aprobación y aplica correcciones con análisis de impacto.

---

## REGLA FUNDAMENTAL

> **Nunca modificar tests para que pasen artificialmente.**
> Si un test falla, el problema está en el código de la aplicación, no en el test.
> La única excepción es un test que esté mal redactado (expectativa incorrecta, setup incompleto) — en ese caso, corregir el test Y explicar por qué.
> Nunca tocar lógica de seguridad ni funcionalidad existente sin aprobación explícita.

---

## Proceso obligatorio — 6 fases

### FASE 0 — Auditoría inicial

1. Leer `backend/package.json` y `frontend/package.json` para detectar qué frameworks de test están instalados.
2. Listar todos los ficheros `*.spec.ts` en `backend/src/` y `frontend/src/`.
3. Intentar ejecutar los tests existentes con sus comandos actuales:
   - Frontend: `cd frontend && npx ng test --watch=false --reporters=verbose`
   - Backend: si tiene script `test` → ejecutarlo; si no, reportar "sin framework instalado"
4. Mostrar el resultado de la auditoría con este formato:

```
## Estado actual de los tests

### Backend
- Framework: [instalado/no instalado]
- Tests existentes: N ficheros
- Tests pasando: X / Y

### Frontend
- Framework: Vitest [versión]
- Tests existentes: N ficheros
- Tests pasando: X / Y

### Cobertura actual estimada
- Backend utilities: [%]
- Backend services: [%]
- Frontend services: [%]
- Frontend pipes/validators: [%]
- Frontend components: [%]
```

5. **Esperar aprobación** antes de instalar nada o escribir ningún test.

---

### FASE 1 — Instalación de dependencias (si faltan)

#### Backend (si no tiene framework de test)

Mostrar exactamente qué se va a instalar y por qué, luego **esperar aprobación**.

Dependencias a instalar:
```
vitest@^4.0.8              # mismo que frontend, consistencia
@vitest/coverage-v8@^4.0.8 # cobertura de código
supertest@^7               # tests HTTP/REST
@types/supertest@^6        # tipos TypeScript para supertest
mongodb-memory-server@^10  # MongoDB en memoria para tests de servicios
```

Comandos tras aprobación:
```bash
cd backend
npm install --save-dev vitest@^4.0.8 @vitest/coverage-v8@^4.0.8 supertest@^7 @types/supertest@^6 mongodb-memory-server@^10
```

#### Ficheros de configuración a crear en backend:

**`backend/vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/__tests__/**'],
    },
  },
});
```

**`backend/src/__tests__/setup.ts`** (se ejecuta antes de cada suite):
```typescript
// Variables de entorno mínimas para que environment.ts no lance durante los tests
process.env['MONGODB_URI']             = 'mongodb://localhost/test-casa-caldereta';
process.env['JWT_SECRET']              = 'test-jwt-secret-for-testing-only-32chars';
process.env['JWT_REFRESH_SECRET']      = 'test-refresh-secret-for-testing-32chars';
process.env['ADMIN_EMAIL']             = 'admin@test.com';
process.env['ADMIN_PASSWORD_HASH']     = '$2a$12$mockhashfortestingpurposesonly..';
process.env['CLOUDINARY_CLOUD_NAME']   = 'test-cloud';
process.env['CLOUDINARY_API_KEY']      = '123456789012345';
process.env['CLOUDINARY_API_SECRET']   = 'test-cloudinary-api-secret-value';
process.env['STRIPE_SECRET_KEY']       = 'sk_test_mock_key_for_testing_purposes';
process.env['STRIPE_WEBHOOK_SECRET']   = 'whsec_test_mock_webhook_secret_value';
process.env['FRONTEND_URL']            = 'http://localhost:4200';
process.env['NODE_ENV']                = 'test';
```

Añadir a `backend/package.json` scripts:
```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

---

### FASE 2 — Escritura de tests

Escribir los tests en este orden exacto. Un bloque a la vez, mostrando el contenido completo antes de crear el fichero. **No pasar al siguiente sin confirmación del usuario.**

---

#### 2.1 — Backend: utilities (sin base de datos)

**`backend/src/__tests__/utils/pricing.util.spec.ts`**

Casos obligatorios:
- `calculateNightPrice` con `DEFAULT_CONFIG` explícito:
  - Lunes (dayOfWeek=1): 2 personas → 100 €, 3 personas → 120 €, 6 personas → 180 €
  - Viernes (dayOfWeek=5): 2 personas → 150 €
  - Sábado (dayOfWeek=6): 2 personas → 180 €
  - Domingo (dayOfWeek=0): cualquier persona → 0 € (cerrado)
  - 1 persona: sin extra (solo base)
  - 6 personas (máximo): base + 4×extraPerPerson
  - 7 personas: se clamp a 6
  - 0 personas: se clamp a 1 (sin extra)
- `calculateNightPrice` con `config` personalizada:
  - monThuPrice=200, friPrice=250, satPrice=300, extraPerPerson=30 → verificar todos los días
- `calculateStayTotal`:
  - 2 noches viernes-domingo (Vie+Sáb): subtotal=150+180=330, deposit=165, remaining=165
  - 1 noche lunes-martes: subtotal=100, deposit=50, remaining=50
  - checkIn === checkOut: 0 noches, subtotal=0, deposit=0, remaining=0
  - Estancia que cruza medianoche: solo importa el día de la fecha, no la hora
- `isSunday`:
  - Un domingo → true
  - Un lunes → false
  - Un sábado → false

**`backend/src/__tests__/utils/password.util.spec.ts`**

Casos obligatorios:
- `hashPassword`: devuelve un string con formato bcrypt (`$2a$` o `$2b$`)
- `hashPassword`: el hash es diferente del texto plano
- `hashPassword`: dos llamadas con la misma contraseña producen hashes distintos (salt aleatorio)
- `verifyPassword`: contraseña correcta → true
- `verifyPassword`: contraseña incorrecta → false
- `verifyPassword`: hash de otra contraseña → false
- No hay que probar `SALT_ROUNDS` directamente (es un detalle de implementación interna)

**`backend/src/__tests__/utils/jwt.util.spec.ts`**

Casos obligatorios:
- `signAccessToken`: devuelve un string con formato JWT (3 partes separadas por `.`)
- `verifyAccessToken`: token válido → devuelve el payload con `role: 'admin'`
- `verifyAccessToken`: token manipulado → lanza `JsonWebTokenError`
- `verifyAccessToken`: token expirado → lanza `TokenExpiredError`
  (crear un token con `expiresIn: 1` ms y esperar con `vi.useFakeTimers`)
- `signRefreshToken` / `verifyRefreshToken`: mismos casos

---

#### 2.2 — Backend: servicios de precio (con MongoDB en memoria)

**`backend/src/__tests__/services/pricing-settings.service.spec.ts`**

Setup/teardown:
```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
afterEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});
```

Casos obligatorios:
- `get()` en BD vacía → crea documento con defaults (monThuPrice=100, friPrice=150, satPrice=180, extraPerPerson=20)
- `get()` llamado dos veces → devuelve el mismo documento (singleton)
- `getConfig()` → devuelve shape `IPricingConfig` correcta
- `update({ friPrice: 175 })` → persiste el cambio y `getConfig()` devuelve friPrice=175
- `update` con valor negativo → no lanza en el servicio (la validación es responsabilidad del controlador)

---

#### 2.3 — Backend: rutas HTTP (supertest)

**`backend/src/__tests__/routes/pricing-settings.routes.spec.ts`**

Setup:
```typescript
import request from 'supertest';
// Importar la app Express (sin llamar a listen)
// Conectar MongoDB en memoria
```

Casos obligatorios:
- `GET /api/v1/pricing-settings` → 200 + body con los 4 campos
- `GET /api/v1/pricing-settings` → sin auth → 200 (ruta pública)
- `PATCH /api/v1/pricing-settings` sin Authorization → 401
- `PATCH /api/v1/pricing-settings` con token válido + `{ friPrice: 175 }` → 200 + dato actualizado
- `PATCH /api/v1/pricing-settings` con token válido + `{ friPrice: -10 }` → 400 (validación)
- `PATCH /api/v1/pricing-settings` con token válido + `{ friPrice: 'abc' }` → 400

**`backend/src/__tests__/routes/auth.routes.spec.ts`**

Casos obligatorios:
- `POST /api/v1/auth/login` con credenciales correctas → 200 + `{ accessToken, refreshToken }`
- `POST /api/v1/auth/login` con email incorrecto → 401
- `POST /api/v1/auth/login` con contraseña incorrecta → 401
- `POST /api/v1/auth/login` sin body → 400
- `POST /api/v1/auth/refresh` con refreshToken válido → 200 + nuevo accessToken
- `POST /api/v1/auth/refresh` con refreshToken inválido → 401
- `POST /api/v1/auth/logout` con refreshToken válido → 200

---

#### 2.4 — Frontend: validators y pipes

**`frontend/src/app/shared/validators/email.validator.spec.ts`**

Casos obligatorios:
- `user@domain.com` → null (válido)
- `user+tag@sub.domain.co.uk` → null
- `USER@DOMAIN.COM` → null (insensible a mayúsculas)
- `notanemail` → `{ invalidEmail: true }`
- `@domain.com` → `{ invalidEmail: true }`
- `user@` → `{ invalidEmail: true }`
- `user @domain.com` (espacio) → `{ invalidEmail: true }`
- `''` (vacío) → null (Validators.required se encarga, no este validator)
- `null` control → null

**`frontend/src/app/shared/pipes/truncate.pipe.spec.ts`**

Casos obligatorios:
- Texto corto (< límite) → sin cambios
- Texto largo (> límite) → truncado + trail `'…'` (o el custom)
- Texto exactamente igual al límite → sin truncar
- Texto = límite + 1 → truncado
- `null` → `''`
- `undefined` → `''`
- Custom trail (`' [...]'`) → se aplica el trail correcto
- Caracteres multibyte: contar por longitud JS, no por codepoints Unicode

**`frontend/src/app/shared/pipes/date-format.pipe.spec.ts`**

Casos obligatorios:
- `Date` object → string en formato español (ej. "lunes, 2 de junio de 2025")
- ISO string → mismo resultado
- timestamp number → mismo resultado
- `null` → `''`
- `undefined` → `''`
- Formato custom → respeta el formato pasado

---

#### 2.5 — Frontend: servicios (HttpClientTestingModule)

**`frontend/src/app/core/services/pricing-settings.service.spec.ts`**

Casos obligatorios:
- `get()` → hace `GET pricing-settings` y devuelve `ApiResponse<IPricingSettings>`
- `update(data)` → hace `PATCH pricing-settings` con el body correcto
- Si el backend devuelve error → el observable emite el error (no lo swallow)

**`frontend/src/app/core/services/auth.service.spec.ts`**

Casos obligatorios:
- `isAuthenticated()` signal → false por defecto
- `login({ email, password })` → POST `/auth/login`, guarda token, `isAuthenticated()` = true
- `logout()` → POST `/auth/logout`, borra token, `isAuthenticated()` = false
- `isTokenExpired()` con token expirado → true
- `isTokenExpired()` con token válido → false

---

#### 2.6 — Frontend: componentes clave (shallow)

**`frontend/src/app/features/admin/components/admin-pricing-base/admin-pricing-base.component.spec.ts`**

Setup: `TestBed` con `HttpClientTestingModule` + `PricingSettingsService` real.

Casos obligatorios:
- Se crea el componente sin errores
- En estado `isLoading=true` → muestra el mensaje de carga
- Tras carga exitosa → muestra el formulario
- Tras carga con error → muestra el mensaje de error
- El formulario tiene los 4 campos numéricos
- Al enviar el formulario → llama a `settingsService.update()` con los valores correctos
- Tras guardar con éxito → muestra el mensaje de éxito y lo oculta tras 3 s (fake timers)

**`frontend/src/app/features/booking/components/booking-request-panel/booking-request-panel.component.spec.ts`**

Casos obligatorios:
- Se crea sin errores con `checkIn` y `checkOut` como inputs
- Sin checkIn/checkOut → botón de reserva desactivado
- Con fechas válidas y nombre/email → botón activo
- Submit sin checkIn/checkOut → no llama al servicio
- Submit con datos válidos → llama a `bookingService.createCheckout()`

---

### FASE 3 — Ejecución de todos los tests

Ejecutar los tests en este orden y capturar salida completa:

```bash
# Backend
cd backend && npx vitest run --reporter=verbose 2>&1

# Frontend
cd frontend && npx ng test --watch=false --reporters=verbose 2>&1
```

Capturar la salida completa de cada comando. Si hay tests que tardan más de 60 segundos, añadir `--timeout=60000`.

---

### FASE 4 — Reporte de fallos

Mostrar el siguiente reporte de forma estructurada. **No aplicar ningún cambio todavía.**

```
## Resultados de los tests

### Resumen
| Suite         | Pasando | Fallando | Omitidos | Total |
|---------------|---------|----------|----------|-------|
| Backend utils |         |          |          |       |
| Backend svcs  |         |          |          |       |
| Backend HTTP  |         |          |          |       |
| Frontend      |         |          |          |       |
| **TOTAL**     |         |          |          |       |

### Fallos (ordenados por severidad)

#### 🔴 CRÍTICO — Afecta seguridad o funcionalidad core
[listar aquí]

#### 🟠 ALTO — Lógica incorrecta en servicio o componente
[listar aquí]

#### 🟡 MEDIO — Comportamiento inesperado en caso edge
[listar aquí]

#### ⚪ BAJO — Test de scaffolding obsoleto (ej. "Hello, frontend")
[listar aquí]
```

Para cada fallo individual, usar este formato:
```
**[nº]. <Nombre del test>**
- Fichero: `path/al/fichero.spec.ts:línea`
- Error: `<mensaje de error exacto>`
- Causa probable: <explicación en una frase>
```

**Después del reporte, preguntar:**

> ¿Confirmas este listado? Si hay algún test que no debería estar, indícamelo antes de continuar con las correcciones.

---

### FASE 5 — Análisis de correcciones (ANTES de tocar nada)

Para cada fallo, mostrar el análisis de impacto con este formato antes de aplicar cualquier cambio:

```
### Fix #N — <título>

**Fichero a modificar:** `path/al/fichero.ts` (código de aplicación, no el test)
**Tipo de cambio:** [Bug fix / Completar implementación / Corregir test mal escrito]

**ANTES:**
```typescript
// código actual
```

**DESPUÉS:**
```typescript
// código corregido
```

**Impacto en seguridad:** ✅ Ninguno / ⚠️ [describir]
**Impacto en funcionalidad:** ✅ Ninguno / ⚠️ [describir]
**Impacto en otros tests:** ✅ No afecta / ⚠️ [describir qué otros tests se ven afectados]
**Efecto observable para el usuario:** ✅ Sin cambio visible / ⚠️ [describir]
```

Mostrar todos los análisis juntos y luego preguntar:

> ¿Apruebas aplicar estos cambios? Puedes indicarme cuáles omitir numerándolos.

---

### FASE 6 — Aplicación de correcciones

Solo tras aprobación explícita:

1. Aplicar los cambios fichero a fichero (uno a la vez, mostrando qué se hace)
2. Tras cada grupo de cambios, ejecutar los tests de ese módulo para verificar
3. Al finalizar todos los cambios, ejecutar la suite completa
4. Mostrar el resultado final con el mismo formato de la Fase 4

Si al re-ejecutar aparecen **nuevos fallos** que no estaban en el informe inicial, detener y reportarlos al usuario antes de continuar.

---

## Notas de contexto del proyecto

### Por qué `environment.ts` necesita el setup file

`environment.ts` llama `requireEnv()` en el módulo raíz — se ejecuta al importar el módulo, no solo al llamar funciones. Sin el setup file que defina las variables de entorno de antemano, Vitest fallará al descubrir los tests con `Error: Variable de entorno requerida no encontrada: MONGODB_URI`.

La solución es `setupFiles: ['src/__tests__/setup.ts']` en `vitest.config.ts` — Vitest lo ejecuta antes de cada suite, antes de cualquier import de módulo.

### Por qué se usa mongodb-memory-server y no mocks

Mockear Mongoose puede ocultar bugs reales de consultas (índices, validaciones de esquema, defaults). `mongodb-memory-server` arranca una instancia real de MongoDB en memoria — misma semántica que producción, sin necesidad de conexión externa. Los tests de servicios son por tanto tests de integración ligeros.

### Patrón para tests de servicios Angular

```typescript
describe('PricingSettingsService', () => {
  let service: PricingSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PricingSettingsService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service   = TestBed.inject(PricingSettingsService);
    http      = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());
  // ...
});
```

### Fake timers para setTimeout en Angular

```typescript
it('oculta el mensaje de éxito tras 3 s', () => {
  vi.useFakeTimers();
  // ... guardar
  vi.advanceTimersByTime(3000);
  expect(component.saveSuccess()).toBe(false);
  vi.useRealTimers();
});
```

### El test de scaffolding que va a fallar

`frontend/src/app/app.spec.ts` comprueba `querySelector('h1')?.textContent` = `'Hello, frontend'`.
Ese texto no existe en el AppComponent real. La corrección es eliminar ese test (no el componente)
o reemplazarlo por uno real que compruebe que el componente se crea y que el router-outlet existe.

### Nivel de cobertura objetivo

| Capa                      | Objetivo mínimo |
|---------------------------|----------------|
| Backend utils puras       | 100 %          |
| Backend pricing service   | 90 %           |
| Backend rutas HTTP críticas | 80 %          |
| Frontend pipes/validators | 100 %          |
| Frontend servicios core   | 80 %           |
| Frontend componentes clave | 70 %          |
