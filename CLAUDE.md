# Casa Caldereta — Sesión de Desarrollo

## Descripción del proyecto
Web de alquiler vacacional para Casa Caldereta, Aielo de Rugat (Valencia, España).
Diseño de lujo estilo boutique (inspiración: ritualdeterra.com). Monorepo Angular 21 + Node.js/Express + MongoDB.

---

## Stack técnico confirmado
| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular 21 Standalone, SCSS + BEM estricto | 21.2.0 |
| Estado | NgRx Store + Effects + Router Store + DevTools | 21.1.0 |
| i18n | ngx-translate + http-loader | 17.0.0 |
| Fechas | date-fns | 4.4.0 |
| Backend | Node.js + Express + TypeScript | Node 26.3.0 |
| Base de datos | MongoDB + Mongoose | latest |
| Imágenes | Cloudinary | latest |
| Pagos | Stripe | latest ✅ implementado |

## Entorno de desarrollo
- Node.js: 26.3.0
- npm: 11.16.0
- Angular CLI: 21.2.14
- TypeScript backend: 6.0.3

## Repositorio GitHub
- URL: https://github.com/RGC02995/casa-caldereta.git
- Rama principal: `main`
- Estrategia: un commit por fase o bloque significativo

## Hosting aprobado
| Servicio | Para qué |
|---|---|
| Vercel | Frontend Angular |
| Railway | Backend Node.js |
| MongoDB Atlas | Base de datos |
| Cloudinary | Gestión de imágenes |
| Namecheap | Dominio |

---

## Convenciones Angular 21 Standalone (SIEMPRE respetar)

### Arquitectura
- **Standalone puro** — sin NgModules en ningún caso
- Cada componente declara sus propios `imports: []`
- Config global en `app.config.ts` con `ApplicationConfig`
- Rutas lazy: `loadComponent()` para un componente, `loadChildren()` para array de rutas
- Feature routes en ficheros `*.routes.ts` (array plano, no módulos)

### Nombrado de ficheros
- Componentes: `name.component.ts` / `name.component.html` / `name.component.scss`
- Rutas de feature: `name.routes.ts`
- Servicios: `name.service.ts`
- Guardas: `name.guard.ts`
- Interceptores: `name.interceptor.ts`
- Modelos: `name.model.ts`
- Pipes: `name.pipe.ts`
- Directivas: `name.directive.ts`

### Selectores de componentes (SIN prefijo app-)
- Usar el nombre descriptivo directo: `loading-spinner`, `image-card`, `modal`, `cookie-banner`
- EXCEPCIÓN: si el nombre coincide con un elemento HTML nativo → usar alternativa (`btn` en lugar de `button`)
- Directivas: camelCase como atributo (`clickOutside`, `hasPermission`)

### Signals y reactividad
- `input<T>(default)` en lugar de `@Input()` — forma Angular 21 moderna
- `input.required<T>()` cuando el valor es obligatorio
- `output<T>()` en lugar de `@Output() EventEmitter`
- `computed()` para valores derivados de signals
- `signal()` para estado local mutable

### HTTP e interceptores
- `provideHttpClient(withInterceptors([authInterceptor]))` en `app.config.ts`
- Interceptores funcionales (`HttpInterceptorFn`), nunca class-based

### ngx-translate v17
- `provideTranslateService({ defaultLanguage })` en `app.config.ts`
- `...provideTranslateHttpLoader({ prefix, suffix })` en providers
- En componentes: importar `TranslatePipe` de `@ngx-translate/core`

### Imports en servicios y ficheros TypeScript
- Rutas RELATIVAS siempre (no path aliases @core/ etc. — el compilador AOT puede fallar)
- Los path aliases solo funcionan en el IDE para navegación, no en el compilador

### SCSS
- `@use '../../../styles/variables' as *;` ANTES de `@use '../../../styles/mixins' as *;`
- Contar niveles correctamente desde la ubicación del fichero hasta `src/`
  - `src/app/` → `../styles/`
  - `src/app/core/` → `../../styles/`
  - `src/app/shared/components/name/` → `../../../../styles/`
  - `src/app/features/feature/pages/name/` → `../../../../../styles/`
- BEM estricto: `.bloque__elemento--modificador`
- Sin estilos inline en HTML nunca
- Sin `!important` nunca

---

## Normas de desarrollo (SIEMPRE respetar)
1. **Seguridad y legalidad son la máxima prioridad**
2. Tipado estricto TypeScript — sin `any` explícito nunca
3. BEM estricto en todos los estilos
4. SOLID + DRY — cada lógica separada, sin duplicación
5. Sin lógica de negocio en componentes Angular
6. Variables sensibles solo en `.env` — nunca en código
7. Consentimiento de cookies antes de cualquier tracker
8. Checkbox de aceptación en todos los formularios con datos personales
9. **No ejecutar ninguna acción sin aprobación explícita del usuario**
10. Antes de cada acción: explicar QUÉ, POR QUÉ y CÓMO
11. Mostrar siempre ANTES/DESPUÉS de cada fichero con explicación del código
12. Ir paso a paso — un fichero / concepto a la vez

---

## Estructura de features (rutas)
| Ruta Angular | Fichero de rutas | Descripción |
|---|---|---|
| `/` | `home.routes.ts` | Landing page pública |
| `/reservar` | `booking.routes.ts` | Calendario y reservas |
| `/galeria` | `gallery.routes.ts` | Fotos de la casa |
| `/rutas` | `routes.routes.ts` | Actividades turísticas |
| `/admin` | `admin.routes.ts` | Panel propietario (protegido) |
| `/legal/*` | `legal.routes.ts` | Páginas legales |

---

## Estado del proyecto

### Fase 1 — Fundación ✅ COMPLETADA (2026-06-04) — commiteada en main
- [x] Node.js 26.3.0 + Angular CLI 21.2.14
- [x] Monorepo raíz (package.json workspaces, .gitignore, .gitattributes, .env.example, CLAUDE.md)
- [x] Angular 21.2.0 Standalone en `frontend/`
- [x] ESLint configurado (eslint.config.js flat format, sin prefijo app- en selectores)
- [x] tsconfig estricto con path aliases (@core, @shared, @features, @store, @environments, @assets)
- [x] Backend Node.js/Express/TypeScript en `backend/` (8 directorios de estructura)
- [x] 52 directorios de estructura en `frontend/src/`
- [x] Environments (environment.ts + environment.prod.ts) con file replacement en angular.json
- [x] src/assets/ añadido a angular.json como asset path
- [x] Estilos globales SCSS (_variables.scss, _mixins.scss, _reset.scss, styles.scss)
- [x] Design tokens: colores, tipografía, espaciado, breakpoints, sombras, transiciones
- [x] 5 modelos TypeScript (ApiResponse, User, Booking, Route, Photo)
- [x] Auth: AuthService con Signals, authGuard funcional, authInterceptor funcional con refresh
- [x] Servicios core: ApiService genérico, LoggerService, ErrorHandlerService
- [x] NgRx global (AppState con router, appReducers, AppEffects)
- [x] app.config.ts con todos los providers (NgRx, HTTP, i18n, Auth, DevTools)
- [x] app.routes.ts con lazy loading a los 6 feature routes
- [x] 6 feature stubs compilando: Home, Booking, Gallery, Routes, Admin, Legal
- [x] i18n: es.json + en.json con claves base
- [x] BUILD exitoso — 0 errores
- [x] Repositorio GitHub vinculado, rama main, primer commit "first commit"

### Fase 2 — Shared Components ✅ COMPLETADA (2026-06-04)
- [x] ButtonComponent (`btn`) — variantes: primary/secondary/outline/ghost, tamaños: sm/md/lg, loading, disabled
- [x] LoadingSpinnerComponent (`loading-spinner`) — tamaños: sm/md/lg, role=status, accesible
- [x] ImageCardComponent (`image-card`) — ratios: landscape/square/portrait, overlay animado, lazy load, teclado
- [x] ModalComponent (`modal`) — `<dialog>` nativo, focus trap automático, backdrop, animación entrada, slots ng-content
- [x] CookieBannerComponent (`cookie-banner`) — AEPD-compliant, 3 categorías, toggles, localStorage, expandible
- [x] Directiva: clickOutside — `@HostListener document:click` + `contains()`
- [x] Directiva: hasPermission — estructural, `effect()` reactivo a auth + input
- [x] Pipe: dateFormat — `date-fns` v4, locale español, acepta Date/string/number/null
- [x] Pipe: truncate — recorte por caracteres, `trimEnd()` antes del trail
- [x] Validador: email — regex estricta, devuelve `{ invalidEmail: true }`, compatible con Validators.required

### Fase 3 — Layout & Navegación ✅ COMPLETADA (2026-06-04)
- [x] SiteHeaderComponent (`site-header`) — transparente/scrolled, nav desktop, overlay móvil, i18n, lang toggle, logo
- [x] SiteFooterComponent (`site-footer`) — 4 columnas, licencia CV-VUT0058371-V, links legales, logo con CSS filter
- [x] Layout en AppComponent — site-header + router-outlet + site-footer + cookie-banner, ocultar en /admin con toSignal
- [x] Página 404 (`not-found-page`) — lazy load en ruta `**`, diseño boutique centrado

### Fase 4 — Páginas públicas ✅ COMPLETADA (2026-06-05)
- [x] Home: hero, highlights x4 (datos reales), comodidades (6 grupos, chips), galería preview, rutas preview x3, CTA reserva
- [x] Galería completa con lightbox — grid 2/3/4 cols, GalleryLightboxComponent con ←→ teclado
- [x] Rutas/actividades con cards — 5 rutas placeholder, badges dificultad, grid 1/2/3 cols
- [x] Calendario de reservas con precios — selección rango fechas, €150/noche placeholder, formulario solicitud + RGPD
- [x] Páginas legales completas — Aviso Legal, Privacidad, Cookies, T&C — SCSS compartido BEM, sub-nav sticky, contenido real RGPD/LSSI/CV-VUT0058371-V

### Fase 5a — Backend Auth ✅ COMPLETADA (2026-06-08)
- [x] backend/.env con JWT secrets, ADMIN_EMAIL, ADMIN_PASSWORD_HASH (bcrypt), MONGODB_URI
- [x] backend/scripts/generate-admin.js — helper para generar hash bcrypt
- [x] src/types/auth.types.ts — ILoginRequest, IAuthTokenPair, ITokenPayload, IApiResponse
- [x] src/config/environment.ts — variables de entorno con validación en arranque
- [x] src/config/database.ts — conexión Mongoose con reconexión automática
- [x] src/utils/jwt.util.ts — sign/verify accessToken y refreshToken
- [x] src/utils/password.util.ts — hashPassword y verifyPassword con bcryptjs
- [x] src/middleware/rate-limit.middleware.ts — authRateLimiter (5/15min) + globalRateLimiter
- [x] src/middleware/require-auth.middleware.ts — Bearer token, AuthenticatedRequest
- [x] src/services/auth.service.ts — login, refresh (rotación), logout con Set en memoria
- [x] src/controllers/auth.controller.ts — loginHandler, refreshHandler, logoutHandler con try/catch
- [x] src/routes/auth.routes.ts — POST /login (rate limited), POST /refresh, POST /logout
- [x] src/routes/index.ts — apiRouter con health check y montaje de authRouter
- [x] src/server.ts — Express + Helmet + CORS + Morgan + rate limit global + MongoDB

### Fase 5b — Frontend Admin ✅ COMPLETADA (2026-06-08)
- [x] Página login `/admin/login` — formulario reactivo, errores granulares (401/429/5xx), conectado al backend
- [x] `noAuthGuard` — redirige a `/admin` si ya hay sesión activa
- [x] `authGuard` — protege layout admin, redirige a `/admin/login` si no autenticado
- [x] `isTokenExpired()` en AuthService — valida claim `exp` del JWT al restaurar sesión
- [x] Admin layout con sidebar — navegación, logout, responsive con backdrop móvil
- [x] Dashboard conectado al backend — próximas reservas via `GET /bookings/upcoming`, estado casa derivado, accesos rápidos

### Fase 5c — Gestión de contenido ✅ COMPLETADA (2026-06-08)
- [x] Backend reservas: modelo Mongoose, servicio, controlador, rutas (con requireAuth)
- [x] Frontend `BookingService` — getAll, getUpcoming, getById, create, updateStatus, delete
- [x] Página admin reservas — lista completa, filtros por estado, cambio de estado (máquina de estados), eliminación
- [x] Backend fotos: modelo Mongoose, servicio Cloudinary (upload_stream), controlador, rutas (multer memoryStorage, JPEG/PNG/WebP, 10MB)
- [x] Página admin fotos — subida con preview local, grid por categoría, eliminación (Cloudinary + MongoDB)
- [x] Backend rutas: modelo Mongoose (slug auto-generado), servicio, controlador, rutas (GET público, resto requireAuth)
- [x] Frontend `RouteService` Angular — getAll, getPublished, getBySlug, create, update, togglePublished, delete
- [x] Página admin rutas — tabla ordenada, formulario create/edit inline, puntos de ruta dinámicos, publicar/despublicar, eliminar
- [x] Gestión de calendario y precios

### Fase 6+7 — Emails + SEO ✅ COMPLETADA (2026-06-10)
- [x] EmailService con Resend — email propietario (nueva reserva) + emails huésped (recibida/confirmada/cancelada)
- [x] RESEND_OVERRIDE_TO para redirigir emails en desarrollo
- [x] SeoService — Title/Meta/OG/canonical por página
- [x] JSON-LD LodgingBusiness en index.html
- [x] robots.txt + sitemap.xml en frontend/public/

### Fase 8 — Despliegue ✅ COMPLETADA (2026-06-11)
- [x] `environment.prod.ts` con URL real de Railway
- [x] `vercel.json` con SPA rewrites
- [x] MongoDB Atlas — whitelist `0.0.0.0/0` para Railway
- [x] Railway — `app.set('trust proxy', 1)` para express-rate-limit
- [x] Railway — variables de entorno: `NODE_ENV`, `CORS_ORIGIN_PROD`, todas las requeridas
- [x] Frontend desplegado en Vercel: `https://casa-caldereta-frontend.vercel.app`
- [x] Backend desplegado en Railway: `https://backend-production-d85c.up.railway.app`

### Post-despliegue — Mejoras (2026-06-15)
- [x] Fix home gallery: `previewPhotos` de `slice(1,5)` a `slice(0,4)` — fotos Cloudinary visibles en home
- [x] Fix highlights desktop: eliminado `--offset` margin-top en cards para altura uniforme
- [x] Rutas admin: subida de imagen de portada (file picker + preview + Cloudinary) — `POST /routes/:id/cover-image`
- [x] Sistema de reseñas completo: backend (modelo/servicio/controlador/rutas) + frontend público + admin
- [x] Reorganización frontend — estructura profesional Angular:
  - `site-header` y `site-footer` movidos a `core/layout/`
  - `not-found-page` movido a `core/pages/`
  - `_legal-page.scss` movido a `features/legal/` (co-ubicado con su feature)
  - ~23 directorios vacíos del scaffolding eliminados
  - Guards en `core/auth/` (decisión deliberada: son 100% del dominio auth)

### Barrido frontend — Extracción de componentes ✅ COMPLETADO (2026-06-16)
Objetivo: reducir páginas grandes a orquestadoras delgadas + componentes presentacionales reutilizables.
Patrón: página orquestadora (datos + servicios) → componentes hijos vía `input<T>()` / `output<T>()`.

- [x] `home-page` → extraídos: `home-hero`, `home-highlights`, `home-amenities`, `home-gallery-preview`, `home-routes-preview`, `home-cta` (6 componentes en `features/home/components/`)
- [x] `booking-page` → extraídos: `booking-hero`, `booking-calendar`, `booking-request-panel` (3 componentes en `features/booking/components/`)
  - Página: 382 TS → ~100 / 283 HTML → ~22 líneas
  - `checkIn`/`checkOut` son señales de la página; calendario emite cambios via output
  - 409 conflict: panel emite `conflictDetected` → página resetea fechas y recarga
- [x] `admin-routes` → extraídos: `admin-route-form`, `admin-route-list` (2 componentes en `features/admin/components/`)
  - Página: 290 TS → ~100 / 419 HTML → ~33 líneas
  - `admin-route-form`: dueño de `formData` + coverImageFile; usa `effect()` para pre-rellenar al editar; emite `IRouteFormSubmitEvent`
  - `admin-route-list`: tabla+tarjetas responsive; emite editRoute/togglePublished/deleteRoute
  - Bug fix: errores de validación ahora locales en el form (`validationError`), no en el banner de página
  - Fix budget: SCSS de 692 líneas repartido entre 3 ficheros → warning de budget desaparece
- [x] `admin-calendar` → extraídos: `admin-calendar-panel`, `admin-pricing-rules`, `admin-blocked-periods` (3 componentes en `features/admin/components/`)
  - Página: 331 TS → ~100 / 357 HTML → ~25 líneas
- [x] `admin-bookings` → extraído: `admin-booking-list` (1 componente en `features/admin/components/`)
  - Página: 127 TS → ~85 / 202 HTML → ~50 líneas
  - `guestName` viaja en los eventos `IBookingStatusChangeEvent` / `IBookingDeleteEvent` — la página no busca en array
  - `__badge` duplicado intencionalmente en page SCSS (leyenda usa clases badge pero View Encapsulation impide herencia del hijo)
- [x] `admin-gallery` → extraídos: `admin-gallery-upload` (smart), `admin-gallery-grid` (dumb) (2 componentes en `features/admin/components/`)
  - Página: 154 TS → ~65 / 136 HTML → ~18 líneas / 421 SCSS → ~15 líneas
  - `admin-gallery-upload`: inyecta `PhotoService`, dueño de `viewChild<fileInput>`, estado de subida, `onUploadSubmit()`, `resetUploadForm()`; emite `uploadCompleted`
  - `admin-gallery-grid`: dumb, recibe `photos`/`processingId`/`activeFilter`/`loadError`/`deleteError`; emite `filterChanged`/`deleteRequested`
  - Errores separados: `uploadError` (interno al upload) vs `deleteError` (señal en página, pasada al grid)

**Total barrido:** 16 componentes nuevos en `features/*/components/` — todas las páginas grandes convertidas en orquestadoras delgadas.

### Stripe — Pagos completos ✅ COMPLETADO (2026-06-17)
- [x] Backend: `stripe-webhook.controller.ts` — verifica firma con `constructEvent`, procesa `checkout.session.completed`, llama `bookingService.confirmFromStripe()`
- [x] Webhook montado ANTES de `express.json()` con `express.raw()` — imprescindible para verificación de firma
- [x] `STRIPE_WEBHOOK_SECRET` en Railway apunta al signing secret del Dashboard (no al CLI local)
- [x] Endpoint registrado en Stripe Dashboard: `https://backend-production-d85c.up.railway.app/webhooks/stripe`
- [x] Flujo: `pending_payment` → webhook → `confirmed` automático → admin puede "Completar" o "Reembolsar y cancelar"
- [x] `stripePaymentIntentId` en modelo `IBooking` — diferencia reservas Stripe de manuales
- [x] Botón "Reembolsar y cancelar" en admin solo para `confirmed` + `stripePaymentIntentId` — `BookingService.refundBooking()`
- [x] Filtro `pending` eliminado del admin (flujo manual obsoleto con Stripe); `pending_payment` en su lugar
- [x] Leyenda de estados actualizada: explica confirmación automática vía webhook y bloqueo 30 min

### Barrido señales — Auditoría reactiva ✅ COMPLETADO (2026-06-16)
Objetivo: eliminar suscripciones manuales sin protección ante destroy en todos los componentes.
Skill usada: `/barrido-señales` (`.claude/commands/barrido-señales.md`)

- [x] **Tipo A** — `booking-page`: `loadData()` con 3 `subscribe()` → `BehaviorSubject + toSignal()` × 3; `switchMap` cancela peticiones solapadas
- [x] **Tipo B** — `admin-routes`: `DestroyRef` + `takeUntilDestroyed` en 3 handlers (onFormSubmit, onTogglePublished, onDeleteRoute)
- [x] **Tipo B** — `admin-calendar-panel`: `DestroyRef` + `takeUntilDestroyed` en 4 handlers (onPricingSubmit, deleteRule, onBlockedSubmit, deleteBlockedPeriod)
- [x] **Tipo B** — `admin-gallery-upload`: `DestroyRef` + `takeUntilDestroyed` en 1 handler (onUploadSubmit)
- [x] **Tipo B** — `admin-gallery`: `DestroyRef` + `takeUntilDestroyed` en 1 handler (onDeleteRequested)
- [x] **Tipo B** — `admin-login`: `DestroyRef` + `takeUntilDestroyed` en 1 handler (onSubmit)
- [x] **Tipo B** — `admin-reviews`: `DestroyRef` + `takeUntilDestroyed` en 2 handlers (approveReview, deleteReview)
- [x] **Tipo B** — `admin-bookings`: `DestroyRef` + `takeUntilDestroyed` en 2 handlers (onStatusChange, onDeleteRequested)
- [x] **Tipo B** — `booking-request-panel`: `DestroyRef` + `takeUntilDestroyed` en 1 handler (submitBooking)
- [x] **Tipo B** — `home-reviews`: `DestroyRef` + `takeUntilDestroyed` en 1 handler (submitReview)

**Ignorados correctamente:** `auth.service.ts` logout (fire-and-forget sin callbacks), `ngOnDestroy` en modal/gallery-lightbox/site-header/scroll-reveal (limpieza DOM, no RxJS).

---

### Mejora formulario admin de rutas — puntos ricos, enlaces, galería ✅ COMPLETADO (2026-07-08)
Objetivo: el formulario de creación/edición de rutas del admin solo permitía nombre+descripción por punto de interés; se amplió a petición del usuario.

- [x] **Puntos de interés** — ahora editables: latitud/longitud (inputs numéricos opcionales, validados en rango), enlace propio (`linkUrl`, ej. ficha de Google Maps/Wikipedia), imagen propia (subida a Cloudinary con preview, igual patrón que la portada)
- [x] **Reordenar puntos** — botones ↑/↓ en cada fila (deshabilitados en los extremos), sin llamada a backend hasta el submit normal
- [x] **Enlace externo de la ruta** — `externalLinkLabel` + `externalLinkUrl` (ej. "Ver en Wikiloc"), validado como URL `http(s)://`
- [x] **Galería de imágenes de la ruta** — subida múltiple + borrado individual inmediato desde el propio formulario admin; **de momento solo gestionable en el admin, no se muestra aún en la web pública** (decisión explícita del usuario, "para luego")
- [x] **Backend** — modelo `IRoute.images` pasó de `string[]` a `{url, publicId}[]` (necesario para poder borrar de Cloudinary sin ambigüedad); 3 endpoints nuevos: `POST /routes/:id/points/:index/image`, `POST /routes/:id/images`, `DELETE /routes/:id/images/:publicId`
- [x] **Merge inteligente en `routeService.update()`** — al guardar el array completo de puntos (edición de texto), empareja cada punto nuevo con el existente **por `imageUrl`** (no por índice) para preservar `imagePublicId` aunque se reordenen/añadan/quiten puntos; detecta y borra de Cloudinary los `imagePublicId` huérfanos
- [x] **`routeService.delete()` ahora limpia Cloudinary** (portada + galería + puntos) — antes de este trabajo no borraba nada al eliminar una ruta, quedaba basura huérfana
- [x] **Fix bug dormido** — el formulario descartaba silenciosamente `imageUrl`/`lat`/`lng` de los puntos en cada guardado (hidratación y submit solo mapeaban `{name, description}`); inofensivo hasta ahora porque nada asignaba esas imágenes, se volvió crítico al añadir la subida de imagen por punto
- [x] **Tests nuevos backend** — `route.service.spec.ts` (7, merge de `imagePublicId` por `imageUrl` incl. reorder/eliminación/huérfanos) + `route.routes.spec.ts` (20, integración HTTP con Cloudinary mockeado) — no existía ningún test de `Route` antes de esto. 178/178 tests backend en verde, 68/68 frontend, `ng build` sin errores
- [x] **Verificado end-to-end con Playwright** contra un MongoDB local efímero (mongodb-memory-server) — sin tocar Atlas ni Cloudinary reales: crear ruta con puntos+lat/lng+enlaces, reordenar, guardar, recargar en modo edición y confirmar que todo persiste correctamente en el orden nuevo
- [x] Commit `838c52f` — pusheado a `main`
- [x] **Fix follow-up (mismo día)** — el enlace externo de la ruta y el enlace de cada punto se guardaban bien pero **no se pintaban en la página pública** `route-detail-page` (se implementó backend+admin pero se olvidó la vista pública). Corregido: enlace externo visible bajo "Sobre esta ruta", enlace de punto ("Más información") visible en su tarjeta si tiene uno. Commit `820f769` — pusheado a `main`

**Pendiente para retomar (no es un bug, es alcance diferido a propósito):**
- [ ] La **galería de imágenes** (`route.images`) y el **lat/lng de los puntos** siguen sin mostrarse en `route-detail-page` (página pública) — solo el enlace se corrigió. Si se quiere mostrar la galería (ej. carrusel bajo la portada) o un mapa con las coordenadas, hay que diseñarlo e implementarlo.
- [ ] Verificar visualmente en producción (tras el deploy automático de Vercel del commit `820f769`) que el enlace externo se ve bien en un móvil real, no solo en el build local.

---

## Datos legales
- **Municipio:** Aielo de Rugat, Valencia, Comunitat Valenciana
- **Licencia turística:** CV-VUT0058371-V ✅
- **Normativa:** LSSI, RGPD, LOPDGDD, Ley 15/2018 Turisme CV, Decreto 92/2009

### Auditoría de seguridad ✅ COMPLETADA (2026-06-17)
- [x] TTL index en `RefreshTokenModel` — ya estaba implementado correctamente
- [x] `CORS_ORIGIN_PROD` obligatoria en producción — `requireEnv()` condicional; el servidor no arranca si falta en Railway
- [x] Rate limiters específicos por endpoint público:
  - `publicRateLimiter` (30 req/min) → `GET /bookings/availability`, `GET /reviews`
  - `checkoutRateLimiter` (3 req/5min) → `POST /bookings/checkout` (previene abuso de sesiones Stripe)
  - `reviewSubmitLimiter` (5 req/hora) → `POST /reviews` (previene spam)
- Nivel de seguridad auditado: **8.5/10** — apto para producción

### Sistema de check-in/out — RD 933/2021 ✅ COMPLETADO (2026-06-17)
- [x] **Backend Fase A:**
  - `booking.model.ts` — +6 campos: `guestFormToken` (SHA-256, select:false), expiry, submitted, checkedInAt, checkedOutAt, preArrivalEmailSentAt
  - `checkin-settings.model.ts` — singleton con `checkInTime`/`checkOutTime` (defaults 16:00/11:00)
  - `traveler-document.model.ts` — todos los campos RD 933/2021 (SES.HOSPEDERÍA)
  - `checkin.service.ts` — token 256 bits + hash SHA-256, single-use, expiry, cron 09:00 pre-llegada 3 días antes
  - `checkin.controller.ts` — 9 handlers (2 públicos + 7 admin), try/catch completo
  - `checkin.routes.ts` — rutas literales antes que `/:bookingId` (evita conflictos Express)
  - `checkinFormRateLimiter` (10 req/hora) + montado en `/api/v1/checkin`
  - Email pre-llegada con enlace seguro + aviso RD 933/2021
  - Cron job diario 09:00 en `server.ts`
- [x] **Frontend Fase B:**
  - `checkin.model.ts` + `checkin.service.ts` — modelo e interfaces Angular
  - `booking.model.ts` — +4 campos opcionales (checkedInAt, checkedOutAt, guestFormSubmittedAt, preArrivalEmailSentAt)
  - Dashboard "Hoy" — sección check-ins/check-outs del día desde `/checkin/today`
  - `admin-booking-list` — botones "Enviar formulario", "Registrar entrada/salida", "Ver viajeros" + chips de estado
  - `admin-bookings` — 3 handlers nuevos + panel de viajeros con "Copiar para SES.HOSPEDERÍA"
  - `admin-checkin-settings` — página `/admin/configuracion` para gestionar horarios
  - Sidebar y quickLinks actualizados con enlace a Configuración
- [x] **Frontend Fase C — Formulario público** ✅ COMPLETADO (2026-06-17):
  - Ruta `/checkin/:token` en Angular — pública, sin authGuard
  - `checkin-form.component.ts/html/scss` en `features/checkin/checkin-form/`
  - 5 estados: loading → invalid / already-submitted / form → success
  - Formulario con `signal<TravelerFormData[]>`, `@for track $index`, validación en submit
  - Campos RD 933/2021: tipoDocumento, numDocumento, numSoporte?, apellido1/2, nombre, sexo, fechaNacimiento, pais, paisResidencia?
  - `ICheckinFormInfo` + `ITravelerInput` en `checkin.model.ts`; `getForm()` + `submitForm()` en `checkin.service.ts`

## Traspaso de cuentas — Estado (2026-06-22)

### Plataformas y propietarios
| Plataforma | Cuenta | Estado |
|---|---|---|
| Railway (backend nuevo) | casacaldereta@gmail.com | ✅ Activo — custom domain `api.casa-caldereta.com` |
| Railway (backend antiguo) | raulgc2995@gmail.com | ✅ Eliminado (2026-07-04) |
| Vercel (frontend) | casacaldereta@gmail.com | ✅ Transferido (2026-07-04) |
| MongoDB Atlas | casacaldereta@gmail.com | ✅ Transferido |
| Cloudinary | raulgc2995@gmail.com | ✅ Se queda así (cliente conforme) |
| Stripe | casacaldereta@gmail.com | ✅ Test mode — webhook apunta a `api.casa-caldereta.com` |
| Resend | casacaldereta@gmail.com | ✅ Activo — FROM: `reservas@casa-caldereta.com`, dominio verificado, click tracking off |
| GitHub | raulgc2995@gmail.com | ✅ Se queda así |
| Namecheap | casacaldereta@gmail.com | ✅ Dominio `casa-caldereta.com` — migración completa (2026-07-04) |

### Email del propietario en el sistema
- `ADMIN_EMAIL` = `casacaldereta@gmail.com`
- `OWNER_EMAIL` = `casacaldereta@gmail.com`
- Emails de reservas, check-in, viajeros → llegan a `casacaldereta@gmail.com` ✅

---

### Sistema de precios + pagos + check-in automático ✅ COMPLETADO (2026-06-22)
- [x] **Motor de precios** — `pricing.util.ts`: basePrice(día semana) + max(0, personas-2)×20€. Lun-Jue 100€ / Vie 150€ / Sáb 180€ / Dom cerrado
- [x] **Stripe 50% depósito** — checkout cobra solo la mitad; `depositAmount`+`remainingAmount` en modelo; webhook distingue `type: deposit` vs `type: remaining`
- [x] **Segundo pago** — `POST /bookings/:id/remaining-payment` crea sesión Stripe; cron 10:00 envía email 7 días antes con enlace de pago
- [x] **Política cancelación** — > 7 días: reembolso; ≤ 7 días: propietario retiene. Checkbox obligatorio antes de pagar en Stripe
- [x] **Check-in automático** — cron cada hora ejecuta a la hora configurada: registra `checkedInAt` + email bienvenida al huésped. El propietario puede seguir haciéndolo manualmente como backup
- [x] **Domingo cerrado** — validado en backend (`SUNDAY_CLOSED`) y bloqueado en frontend
- [x] **Frontend booking** — selector personas 1-6 (output al padre), precio dinámico en tiempo real (total + depósito + resto), checkbox política cancelación
- [x] **T&C actualizadas** — política 50%/7días, arras penitenciales (art. 1454 CC), sin desistimiento (art. 103(l) TRLGDCU), hoja reclamaciones, tabla precios, domingos cerrado
- [x] **Privacidad actualizada** — Stripe, Resend, Railway, Vercel, MongoDB Atlas, Cloudinary nombrados como encargados del tratamiento (art. 28 RGPD)

### Sincronización de calendario iCal — Airbnb/Booking.com ✅ COMPLETADO (2026-07-04)
- [x] **Gap de seguridad cerrado** — `booking.service.ts` → `create()`/`createCheckoutSession()` validan conflicto de fechas también contra `BlockedPeriodModel` (antes solo contra `BookingModel`); evita pagar por Stripe fechas ya bloqueadas manualmente
- [x] **`BlockedPeriodModel`** — campo `origin: 'manual'|'airbnb'|'booking'` + `externalUid` con índice único `sparse` (evita duplicados en cada sincronización)
- [x] **Importación** — `ical-sync.service.ts` (nuevo): cron cada 15 min descarga y parsea (`node-ical`) los feeds `.ics` de Airbnb/Booking, upsert por `UID` + borra los que ya no aparecen (reserva cancelada). Fallo en una plataforma no afecta a la otra ni borra datos si la descarga falla
- [x] **Exportación** — `GET /calendar.ics` (público, sin auth, cache 5 min): genera al vuelo un feed con reservas activas + bloqueos, mismo patrón que `sitemap.controller.ts`
- [x] **Admin** — `/admin/configuracion` muestra la URL de exportación con botón "Copiar" (`navigator.clipboard`)
- [x] Probado end-to-end: reservas/exportación con datos reales (`curl`); importación con un `.ics` de ejemplo hecho a mano (parseo → upsert → borrado de obsoletos correcto)
- **Decisión de diseño:** las URLs `.ics` de Airbnb/Booking se quedan en variables de entorno (`AIRBNB_ICAL_URL`/`BOOKING_ICAL_URL`), no en un ajuste editable desde el admin — el propietario final no es técnico, así que las gestiona raul directamente en `.env`/Railway

### Auditoría de calendario iCal + fixes CORS/FRONTEND_URL (2026-07-05) ✅ COMMITEADO (commits `18bb0ef` + `61c8b29`)
Objetivo: comprobar funcionamiento y seguridad del calendario (disponibilidad, conflictos, sincronización iCal Airbnb/Booking) con una suite de tests nueva, ya que no existía ninguna.

- [x] **Suite de tests nueva — 201 tests, todos en verde** (sin commitear todavía):
  - Backend (7 ficheros en `backend/src/__tests__/`): `routes/booking-availability.routes.spec.ts`, `routes/booking-checkout.routes.spec.ts`, `routes/booking-admin.routes.spec.ts`, `routes/ical-export.spec.ts`, `services/ical-sync.service.spec.ts`, `routes/calendar-round-trip.spec.ts`, `routes/blocked-period.routes.spec.ts`
  - Frontend: `features/booking/components/booking-calendar/booking-calendar.component.spec.ts`
  - Feeds de Airbnb/Booking simulados con un servidor HTTP local (`node-ical` real, sin mocks del parser) — útil para seguir probando la sync sin tener aún las URLs reales
  - Stripe mockeado solo donde hace falta (las validaciones 400/409 ocurren antes de llamar a Stripe)
- [x] **Bug fix — export iCal liberaba el último día de bloqueos manuales** (`backend/src/controllers/ical-export.controller.ts`): RFC 5545 trata `DTEND` como exclusivo pero los bloqueos `origin: 'manual'` son inclusivos (el admin los pinta así) → ahora se exporta `endDate + 1 día` solo para `origin === 'manual'`; los importados de Airbnb/Booking se exportan tal cual (ya vienen exclusivos)
- [x] **Bug fix — feed corrupto (200 + HTML) borraba todos los bloqueos de la plataforma** (`backend/src/services/ical-sync.service.ts`): `node-ical` devuelve `{}` sin lanzar error ante una respuesta no-iCal con HTTP 200 (típico de página de mantenimiento); ahora se valida que exista un componente `VCALENDAR` antes de procesar — si no, se lanza error y el `try/catch` existente preserva los bloqueos de esa plataforma (mismo comportamiento que ante un HTTP 500)
- [x] **Hallazgo detectado durante la auditoría — `CORS_ORIGIN_PROD` y `FRONTEND_URL` en Railway seguían con el dominio antiguo de Vercel**, pese a que `CLAUDE.md` documentaba el cambio como hecho el 2026-07-04:
  - Confirmado con petición `OPTIONS` real contra `api.casa-caldereta.com`: el origen `casa-caldereta.com` sí recibía `access-control-allow-origin` correcto, pero `casa-caldereta-frontend.vercel.app` no recibía ningún header CORS
  - `FRONTEND_URL` mal apuntado afecta a **5 sitios**: redirección Stripe tras pagar depósito (éxito/cancelación), redirección tras pagar el resto (éxito/cancelación), y el enlace del formulario de check-in RD 933/2021 enviado por email — confirmado en vivo: tras un pago de prueba, Stripe redirigió a `https://casa-caldereta-frontend.vercel.app/reservar/pago-exitoso?...` en vez de al dominio propio
  - `backend/.env` **local** corregido: `CORS_ORIGIN_PROD="https://casa-caldereta.com,https://casa-caldereta-frontend.vercel.app"` (se decidió mantener el dominio antiguo de Vercel funcionando, de ahí la lista con coma) y `FRONTEND_URL="https://casa-caldereta.com"` (aquí solo puede haber un valor — es la URL de redirección)
  - **Railway (producción) — PENDIENTE, el usuario debe actualizarlo manualmente** (sin acceso desde aquí): mismas variables, mismos valores, en el servicio backend → Variables → esperar redeploy automático
- [x] **Fix hallazgo #2 — calendario del frontend no deshabilitaba el domingo como check-in** (`booking-calendar.component.ts`): el backend ya rechazaba con 400 cualquier `checkIn` en domingo (`validateCheckInDay`, coincide con el modelo Airbnb/Booking: domingo solo día de salida, sin cobrar esa noche), pero el calendario dejaba clicarlo igual que cualquier otro día y el usuario solo lo descubría al pedir presupuesto o pagar. Nuevo método `wouldStartNewRange()` replica la lógica de `onDayClick` para saber si un clic definiría un nuevo check-in; `isDisabled` ahora también es `true` cuando el día es domingo y ese clic sería un check-in. El domingo sigue siendo perfectamente seleccionable como check-out (sin cambios en `onDayClick`, precios ni backend). Tests actualizados: hallazgo documentado pasa a test de comportamiento correcto + 2 tests nuevos confirman domingo como check-out válido. 67/67 tests frontend en verde.
- [x] **Fix hallazgo #1 — `POST /bookings` (admin) no comprobaba `pending_payment` vivo como conflicto** (2026-07-06, `backend/src/services/booking.service.ts`): `create()` solo comprobaba solape contra `pending`/`confirmed`, ignorando reservas `pending_payment` con sesión Stripe todavía viva (ventana de 30 min, `stripeSessionExpiresAt`) — el admin podía crear una reserva manual solapada con un pago en curso. Alineado con el patrón ya usado en `createCheckoutSession()`/`getAvailability()`/`getExportRanges()`: `$or` con `pending`/`confirmed` más `pending_payment` solo si `stripeSessionExpiresAt > now`. Test que documentaba el bug (esperaba 201) cambiado a exigir 409; test nuevo confirma que un `pending_payment` con sesión ya caducada sigue permitiendo 201 (no bloquea fechas indefinidamente).
- [x] **Fix hallazgo #3 (back-to-back) — calendario no permitía terminar una estancia el día que entra otra reserva** (2026-07-06, `booking-calendar.component.ts`, `buildCalendarDays()`): `isBooked` marcaba como ocupado el propio día de llegada (`r.start`) de una reserva existente, bloqueándolo también como check-out válido de otra estancia, aunque el backend sí lo acepta (intervalo semiabierto, sin solape real de noches — salida 11:00 / entrada 16:00). Se distingue ahora día "interior" (noche realmente ocupada, siempre bloquea) de día "frontera de llegada" (solo bloquea si el clic definiría un nuevo check-in), reutilizando el helper `wouldStartNewRange()` ya existente para el caso del domingo — mismo patrón, sin tocar `onDayClick`, precios ni backend. Test que documentaba el bug pasa a exigir el comportamiento correcto; test nuevo confirma que ese día sigue bloqueado como nuevo check-in sin selección previa. 68/68 tests frontend en verde.
- [x] **Fix hallazgo #4 — `GET /blocked-periods` público exponía `reason`/`origin`/`externalUid`** (2026-07-06, `backend/src/services/blocked-period.service.ts` + `routes/blocked-period.routes.ts`): la ruta pública devolvía el documento completo (notas internas del propietario, origen de sincronización, UID externo de Airbnb/Booking). Mismo patrón ya usado en `booking.service.ts` para reservas (`getAvailability()` con proyección mínima vs `getAll()` protegido): nuevo método `getPublicAvailability()` con proyección `{ startDate: 1, endDate: 1, _id: 0 }` en ruta pública `GET /blocked-periods/availability` (con `publicRateLimiter`); `GET /blocked-periods` (documento completo) pasa a exigir `requireAuth` — el admin sigue funcionando sin cambios de código porque el interceptor HTTP ya añade el token a todas las peticiones cuando hay sesión activa. Frontend: `booking-page`/`booking-calendar` cambiados al nuevo endpoint con tipo mínimo `IBlockedPeriodAvailability`; `admin-calendar` no se toca. Test que documentaba la fuga ahora exige 401 sin token; tests nuevos confirman que `/availability` no incluye esos campos y que `/` con token de admin sí. 140/140 tests backend y 68/68 frontend en verde.
- [x] **Fix hallazgo #5 — backend trataba el `endDate` de un bloqueo manual como exclusivo** (2026-07-06, `backend/src/services/booking.service.ts`, `hasBlockedConflict()`): un huésped podía reservar `checkIn` = `endDate` de un bloqueo manual (el propietario lo pinta/exporta como inclusivo — mismo criterio ya aplicado en el fix de `ical-export.controller.ts`, `+1 día` solo para `origin: 'manual'`), colando una reserva justo el día que se quiso bloquear por completo. `$or` en la query: `origin: 'manual'` compara `endDate: { $gte: checkIn }` (inclusivo), el resto (`airbnb`/`booking`, exclusivos por naturaleza del feed) sigue con `$gt` sin cambios. Se propaga automáticamente a `create()` (admin) y `createCheckoutSession()` (checkout público), que ya comparten este método. Alcance decidido: fix mínimo solo backend, sin tocar el frontend (que hoy suma `+1` día a todos los bloqueos sin distinguir origen — mejora aparte, no incluida). Test que documentaba el bug ahora exige 409; tests nuevos confirman que `airbnb`/`booking` siguen exclusivos (201 sin cambios) y que el back-to-back en el `startDate` de un bloqueo manual sigue permitido. 143/143 tests backend en verde.
- [x] **Fix hallazgo #6 — condición de carrera en la comprobación de conflicto de fechas (Opción B)** (2026-07-06, `backend/src/services/booking.service.ts`): `create()`/`createCheckoutSession()` seguían el patrón "comprobar y luego guardar", con una ventana entre ambos pasos (incluida la llamada de red a Stripe en el checkout) donde dos peticiones concurrentes para las mismas fechas podían pasar ambas la comprobación. Opción A (transacciones MongoDB) descartada por complejidad no justificada para el volumen real de esta web (una sola casa); aplicada **Opción B**: guardar de forma optimista y revalidar justo después con `revalidateAfterSave()` — nuevo método privado que repite la comprobación de conflicto excluyendo el propio documento y con desempate por `_id` (`_id: { $lt: savedId }`): los `ObjectId` de Mongo son estrictamente crecientes en este proceso Node, así que solo la reserva creada **después** se autocancela si detecta a otra ya guardada antes con fechas solapadas (evita que ambas se cancelen entre sí). Si la revalidación detecta conflicto: se borra la reserva recién guardada y, en `createCheckoutSession()`, además se expira la sesión de Stripe ya creada (`stripe.checkout.sessions.expire`) para que el huésped no pueda pagar sobre una reserva que ya no existe. Mismo `code: 'DATE_CONFLICT'` que ya maneja el controller — sin cambios en rutas ni frontend. Tests nuevos en `backend/src/__tests__/services/booking-race-condition.service.spec.ts` (test de servicio, no de ruta HTTP — la carrera real no se puede reproducir de forma fiable con peticiones paralelas sin volverse inestable): simulan la ventana de carrera forzando a `null` la comprobación previa (`vi.spyOn(BookingModel, 'findOne')`) mientras un competidor ya existe en la base de datos. 146/146 tests backend en verde.
- [x] **Fix hallazgo #7 — `/calendar.ics` sin token secreto en la URL** (2026-07-06): la exportación pública no llevaba ninguna protección, cualquiera que adivinase la URL podía ver la ocupación del calendario. Nueva variable de entorno **requerida** `ICAL_EXPORT_TOKEN` (`backend/.env` local ya generado con un valor aleatorio de 32 bytes; falta añadirla en Railway antes de desplegar — ver pendientes). `icalExportHandler` ahora comprueba `req.query.token` contra `env.icalExportToken` → `401` si no coincide. Nuevo endpoint protegido `GET /api/v1/calendar-export-url` (`requireAuth`) que devuelve la URL completa con el token — el frontend (`admin-checkin-settings.component.ts`) ya NO construye la URL en el bundle público (antes usaba `environment.apiUrl`, visible por cualquiera inspeccionando el JS) sino que la pide autenticado. Buen momento para este cambio: aún no se ha pegado la URL de exportación en Airbnb/Booking (ver pendiente de sincronización más abajo), así que no hay que actualizarla en ningún sitio externo. Tests nuevos: `ical-export.spec.ts` (401 sin token / con token incorrecto) y `ical-export-url.routes.spec.ts` (401 sin auth, 200 con token de admin). 150/150 tests backend en verde; frontend sin specs afectados (68/68 en verde).
- [x] Todos los hallazgos de la auditoría de calendario están resueltos.
- [x] **`ICAL_EXPORT_TOKEN` añadido en Railway** (2026-07-07) — redeploy correcto, `GET /health` → 200, backend arrancó sin problema.
- [x] **`CORS_ORIGIN_PROD`/`FRONTEND_URL` verificadas en Railway** (2026-07-07) — petición `OPTIONS` real contra `api.casa-caldereta.com` confirma `access-control-allow-origin: https://casa-caldereta.com` correcto. El dominio antiguo `casa-caldereta-frontend.vercel.app` ya NO recibe cabecera CORS — decisión confirmada con el usuario: es intencional, solo se mantiene el dominio nuevo (más simple y seguro, ya no hay frontend real en esa URL). `backend/.env` local actualizado para reflejar esto (quitada la lista con coma).
- [x] **Pago de prueba real confirmado** (2026-07-07) — Stripe test mode, tarjeta 4242, redirigió correctamente a `https://casa-caldereta.com/reservar/pago-exitoso` (no al Vercel antiguo). `FRONTEND_URL` funcionando en producción.
3. ~~Fichero `admin-gallery-grid.component.html` con sintaxis Angular inválida~~ ✅ arreglado (2026-07-06): `let $index = $index` redeclaraba la variable implícita del `@for` (Angular ya la expone sin declararla) — quitada la redeclaración, `ng build` y `ng test` (68/68) en verde

## Pendientes / Preguntas abiertas
- [ ] **Mostrar galería de imágenes y lat/lng de puntos en `route-detail-page`** (ver sección "Mejora formulario admin de rutas" arriba, 2026-07-08) — ya se pueden gestionar desde el admin pero la página pública de la ruta todavía no las pinta (alcance diferido a propósito, "para luego")
- [ ] **Verificar en producción tras deploy de Vercel** que el enlace externo de ruta/punto (`820f769`, 2026-07-08) se ve bien en móvil real
- [x] **Fix: formulario pre-llegada + segundo pago en reservas last-minute** — `checkinService.handleWebhookPostConfirmation(booking)` llamado desde el webhook de Stripe tras confirmar el depósito. Comprueba centinelas y envía inmediatamente: (1) recordatorio segundo pago si `daysUntilCheckin <= 7` y no pagado ni avisado; (2) formulario RD 933/2021 si `daysUntilCheckin <= 3` y no enviado. Los crons siguen cubriendo el caso normal (check-in > 7 días).
- [ ] **Exportar XML SES.HOSPEDERÍA** — Botón "Exportar XML" en el panel de viajeros (admin reservas). Necesita esquema XML oficial del Ministerio del Interior antes de implementar. Pendiente de documentación técnica del portal SES.HOSPEDERÍA.
- [x] **Resend — Click Tracking desactivado** ✅ (2026-07-04) en resend.com → Domains → `casa-caldereta.com` → Configuration → Enable tracking metrics. Resuelve el problema de los links `awstrack.me` bloqueados por uBO en el email de pre-llegada.
- [x] **Comprar dominio `casa-caldereta.com`** en Namecheap con `casacaldereta@gmail.com` ✅ (2026-06-26)
- [x] **Configurar dominio completo** ✅ (2026-07-04):
  - [x] DNS Namecheap → A `@` → `216.198.79.1` (Vercel) + CNAME `www` → `cname.vercel-dns.com`
  - [x] Vercel → dominios `casa-caldereta.com` y `www.casa-caldereta.com` añadidos y propagados
  - [x] Railway → custom domain `api.casa-caldereta.com` añadido, funcionando en producción
  - [x] Railway → `CORS_ORIGIN_PROD` y `FRONTEND_URL` actualizadas a `https://casa-caldereta.com`
  - [x] Código → `BASE_URL` en `seo.service.ts` + `apiUrl` en `environment.prod.ts` + `sitemap.controller.ts` apuntan a `casa-caldereta.com` / `api.casa-caldereta.com`
  - [x] `vercel.json` → rewrite de `/sitemap.xml` actualizado a `https://api.casa-caldereta.com/sitemap.xml`
  - [x] `backend/.env.example` → placeholders de Vercel sustituidos por `casa-caldereta.com`
  - [x] Resend → dominio verificado + `RESEND_FROM_EMAIL` cambiado a `reservas@casa-caldereta.com`
- [ ] **Stripe live** — KYC (DNI propietario + cuenta bancaria) + claves `sk_live_...` + nuevo webhook secret → actualizar Railway
- [x] **Vercel** — cuenta `casacaldereta@gmail.com` creada + proyecto frontend transferido ✅ (2026-07-04)
- [x] **Railway backend antiguo eliminado** (`backend-production-d85c`) de la cuenta `raulgc2995@gmail.com` ✅ (2026-07-04)
- [ ] **SEO** — código listo, pendiente de commit + deploy y de pasos manuales en Google:
  - [x] JSON-LD `LodgingBusiness` en `index.html` — teléfono (+34677876219), dirección (Carrer de Baix, 3, 46842 Aielo de Rugat) y coordenadas GPS reales (38.8813665, -0.3441232)
  - [x] `og-default.jpg` (1200×630) generado a partir del logo, en `frontend/src/assets/images/`
  - [x] SEO propio (`SeoService.setPage`) añadido a las 4 páginas legales — title/description/canonical ya no comparten el genérico de la home
  - [x] Nombre del titular (Santiago Giner Giner) y código postal (46842) corregidos en las páginas legales
  - [x] Archivo de verificación de Google Search Console (`googlefa134d315ebf21e5.html`) copiado a `frontend/public/`
  - [x] Commiteado + push + deploy a Vercel ✅ (2026-07-04) — verificado en vivo `https://www.casa-caldereta.com/googlefa134d315ebf21e5.html` devuelve 200 con contenido correcto
  - [x] Google Search Console — verificado + sitemap `https://api.casa-caldereta.com/sitemap.xml` enviado ✅ (2026-07-04)
  - [x] **NIF del titular** ✅ (2026-07-07) — `25422225A` añadido en Aviso Legal, Privacidad y Términos (sustituye placeholder `[NIF]`)
  - [ ] Google Business Profile — crear ficha completa (nombre, categoría "Casa rural", dirección pública Carrer de Baix 3, teléfono, fotos) y pasar la verificación postal/telefónica de Google
- [x] **Sincronizar calendario con Booking.com y Airbnb** ✅ COMPLETADO (2026-07-07) — código completo + auditado con tests (ver sección de auditoría arriba), URLs `.ics` reales configuradas en `backend/.env`/Railway y URL de exportación pegada en el panel de sincronización de ambas plataformas
- [x] **Railway — `CORS_ORIGIN_PROD` y `FRONTEND_URL`** ✅ (2026-07-07) — verificado con petición `OPTIONS` real (`casa-caldereta.com` recibe CORS correcto, Vercel antiguo ya no) y con un pago de prueba real en Stripe test mode (redirigió correctamente a `casa-caldereta.com/reservar/pago-exitoso`)
- [x] **`ICAL_EXPORT_TOKEN` en Railway** ✅ (2026-07-07) — añadida, redeploy correcto, backend saludable

---

## Historial de commits
| Commit | Descripción |
|---|---|
| first commit | Fase 1 completa + Fase 2 shared parcial (Button, Spinner, ImageCard) |
| fase 2 completa | Modal, CookieBanner, clickOutside, hasPermission, dateFormat, truncate, emailValidator + fix @use duplicado + .gitattributes |
| fase 3 completa | SiteHeader, SiteFooter, Layout AppComponent, página 404, logo, i18n footer |
| fix logo header | Flex alineación logo+texto, tamaño 52px móvil / 90px desktop, header 80/120px |
| fase 4 parcial  | Home completa (datos reales) + Galería con lightbox ←→ teclado + español por defecto |
| fase 4 completa | Páginas legales: Aviso Legal, Privacidad, Cookies, T&C + SCSS compartido BEM |
| fase 5a completa | Backend auth: JWT + bcrypt + rate limiting + MongoDB Atlas + Express server |
| fase 5b+5c parcial | Admin login + noAuthGuard + layout sidebar + dashboard + backend reservas + BookingService |
| fase 5c completa | Admin reservas + fotos (Cloudinary) + rutas CRUD con slug y puntos dinámicos |
| fix: admin gallery | Recargar fotos desde servidor tras upload y resetear filtro |
| fase 5 completa | Calendario y precios: PricingRule + BlockedPeriod — backend seguro + admin calendar |
| fase 6+7 completas | Emails Resend + SEO + admin reactivo |
| fase 8 completa | Despliegue: Vercel + Railway + MongoDB Atlas + fixes trust proxy/CORS |
| feat: reseñas + fix home gallery + rutas imagen | Sistema reseñas completo, fix previewPhotos slice, subida imagen rutas admin |
| refactor: reorganización frontend | site-header/footer → core/layout, not-found → core/pages, _legal-page → features/legal, 23 dirs vacíos eliminados |
| refactor: barrido frontend — extracción componentes | 16 componentes nuevos: home×6, booking×3, admin-routes×2, admin-calendar×3, admin-bookings×1, admin-gallery×2 |
| refactor: barrido señales — auditoría reactiva | booking-page Tipo A + 9 componentes Tipo B: DestroyRef + takeUntilDestroyed en 16 handlers |
| feat: integración Stripe — pago completo al reservar | Stripe Checkout + webhook Railway + confirmación automática + reembolso desde admin |
| feat: admin reservas — botón reembolso Stripe y estados actualizados | Botón "Reembolsar y cancelar" para confirmed+Stripe, filtro pending eliminado, leyenda actualizada |
| security: CORS_ORIGIN_PROD required en prod + rate limiters por endpoint público | requireEnv CORS en producción + publicRateLimiter/checkoutRateLimiter/reviewSubmitLimiter |
| feat: check-in/out + registro RD 933/2021 | Backend: token SHA-256 + cron emails + 9 endpoints. Admin: sección Hoy, botones checkin, panel viajeros, configuración horarios |
| docs: dominio casa-caldereta.com comprado — estado DNS y pendientes Lunes | Namecheap comprado, DNS Vercel configurado, Railway + Resend + código pendiente |
| feat: sincronización de calendario iCal con Airbnb/Booking.com | Gap seguridad cerrado, BlockedPeriodModel con origen, ical-sync.service.ts (cron 15min), GET /calendar.ics, admin con URL de exportación |
| feat: enriquecer formulario admin de rutas — puntos con lat/lng/enlace/imagen, enlace externo, galería y reordenar (`838c52f`) | images:string[]→{url,publicId}[], 3 endpoints nuevos, merge imagePublicId por imageUrl, delete() limpia Cloudinary, fix bug dormido, 27 tests nuevos |
| fix: mostrar enlace externo de ruta y de puntos en la página pública (`820f769`) | route-detail-page no pintaba externalLinkUrl/linkUrl aunque ya se guardaban desde el admin |
