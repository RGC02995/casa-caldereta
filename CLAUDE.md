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
| Pagos | Stripe | FUTURO — no implementar aún |

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

---

## Datos legales
- **Municipio:** Aielo de Rugat, Valencia, Comunitat Valenciana
- **Licencia turística:** CV-VUT0058371-V ✅
- **Normativa:** LSSI, RGPD, LOPDGDD, Ley 15/2018 Turisme CV, Decreto 92/2009

## Pendientes / Preguntas abiertas
- [ ] Dominio elegido (pendiente)

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
