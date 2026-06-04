# Casa Caldereta — Sesión de Desarrollo

## Descripción del proyecto
Web de alquiler vacacional para Casa Caldereta, Aielo de Rugat (Valencia, España).
Diseño de lujo estilo boutique. Monorepo con Angular 21 + Node.js/Express + MongoDB.

---

## Stack técnico confirmado
| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular + NgModules, SCSS + BEM estricto | 21.2.0 |
| Estado | NgRx Store + Effects + Router Store + DevTools | 21.1.0 |
| i18n | ngx-translate + http-loader | 17.0.0 |
| Fechas | date-fns | 4.4.0 |
| Backend | Node.js + Express + TypeScript | Node 26.3.0 |
| Base de datos | MongoDB + Mongoose | latest |
| Imágenes | Cloudinary | latest |
| Pagos | Stripe | FUTURO — no implementar aún |

## Versiones de entorno
- Node.js: 26.3.0
- npm: 11.16.0
- Angular CLI: 21.2.14
- TypeScript backend: 6.0.3

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
- Arquitectura: **Standalone puro** — sin NgModules
- Ficheros componente: `name.component.ts` / `name.component.html` / `name.component.scss`
- Ficheros rutas de feature: `name.routes.ts` (array de Routes, NO módulos)
- Clases componente: `NameComponent`; cada una declara sus propios `imports: [...]`
- Sin `standalone: false` — todos los componentes son standalone por defecto
- Rutas lazy: `loadComponent()` para un componente, `loadChildren()` para un array de rutas
- Config global en `app.config.ts` con `ApplicationConfig` y providers funcionales
- Imports en servicios: rutas RELATIVAS directas (no path aliases — el compilador AOT puede fallar)
- Interceptores HTTP: `provideHttpClient(withInterceptors([...]))` en `app.config.ts`
- `TranslateHttpLoader` v17: `provideTranslateService()` + `...provideTranslateHttpLoader()`
- Scroll: `withInMemoryScrolling({ scrollPositionRestoration: 'top' })` — NO `withScrollPositionRestoration`

---

## Normas de desarrollo (SIEMPRE respetar)
1. **Seguridad y legalidad son la máxima prioridad**
2. Tipado estricto TypeScript — sin `any` explícito nunca
3. BEM estricto en todos los estilos — sin estilos inline nunca
4. SOLID + DRY — cada lógica separada, sin duplicación
5. Sin lógica de negocio en componentes Angular
6. Variables sensibles solo en `.env` — nunca en código
7. Consentimiento de cookies antes de cualquier tracker
8. Checkbox de aceptación en todos los formularios con datos personales
9. **No ejecutar ninguna acción sin aprobación explícita del usuario**
10. Antes de cada acción: explicar QUÉ, POR QUÉ y CÓMO

---

## Estructura de features (rutas)
| Ruta Angular | Feature module | Descripción |
|---|---|---|
| `/` | HomeModule | Landing page pública |
| `/reservar` | BookingModule | Calendario y reservas |
| `/galeria` | GalleryModule | Fotos de la casa |
| `/rutas` | RoutesModule | Actividades turísticas |
| `/admin` | AdminModule | Panel propietario (protegido) |
| `/legal/*` | LegalModule | Páginas legales |

---

## Estado del proyecto

### Fase 1 — Fundación ✅ COMPLETADA (2026-06-04)
- [x] Node.js 26.3.0 + Angular CLI 21.2.14
- [x] Monorepo raíz (package.json workspaces, .gitignore, .env.example)
- [x] Angular 21.2.0 en `frontend/` con NgRx 21, ngx-translate 17, date-fns 4
- [x] ESLint configurado (eslint.config.js flat format)
- [x] tsconfig estricto con path aliases (@core, @shared, @features, @store, @environments, @assets)
- [x] Backend Node.js/Express/TypeScript en `backend/`
- [x] 52 directorios de estructura en `frontend/src/`
- [x] 8 directorios de estructura en `backend/src/`
- [x] Environments (environment.ts + environment.prod.ts) con file replacement en angular.json
- [x] Estilos globales SCSS (_variables.scss, _mixins.scss, _reset.scss, styles.scss)
- [x] 5 modelos TypeScript (ApiResponse, User, Booking, Route, Photo)
- [x] Auth (AuthService con Signals, authGuard funcional, authInterceptor funcional)
- [x] Servicios core (ApiService, LoggerService, ErrorHandlerService)
- [x] NgRx global (AppState, appReducers, AppEffects)
- [x] Módulos feature con lazy loading (Home, Booking, Gallery, Routes, Admin, Legal)
- [x] BUILD exitoso — 0 errores

### Fase 2 — Core & Shared (PENDIENTE)
- Componentes shared: Button, Modal, CookieBanner, LoadingSpinner, ImageCard
- Directivas: clickOutside, hasPermission
- Pipes: dateFormat, truncate
- Validadores: email
- SharedModule

### Fase 3 — Layout & Navegación (PENDIENTE)
- Header con navegación responsive y menú móvil
- Footer con links legales
- Layout wrapper (header + router-outlet + footer)
- Página 404

### Fase 4 — Páginas públicas (PENDIENTE)
- Home: hero, highlights de la casa, galería preview, rutas preview, CTA reserva
- Galería completa con lightbox
- Rutas/actividades con cards y detalle
- Calendario de reservas con precios
- Páginas legales completas (Aviso Legal, Privacidad, Cookies, T&C)
- Banner de cookies AEPD-compliant

### Fase 5 — Panel administrador (PENDIENTE)
- Login seguro (solo propietario)
- Gestión de fotos (subida a Cloudinary)
- CRUD de rutas con imágenes
- Gestión de calendario y precios

---

## Datos legales
- **Municipio:** Aielo de Rugat, Valencia, Comunitat Valenciana
- **Licencia turística:** [NÚMERO_LICENCIA_TURÍSTICA_CV] — pendiente de recibir esta tarde
- **Normativa:** LSSI, RGPD, LOPDGDD, Ley 15/2018 Turisme CV, Decreto 92/2009

---

## Pendientes / Preguntas abiertas
- [ ] Número de licencia turística (el usuario lo compartirá)
- [ ] Dominio elegido (pendiente)

---

## Historial de sesiones
| Fecha | Qué se hizo |
|---|---|
| 2026-06-04 | Fase 1 completada: monorepo, Angular 21 + NgRx, backend Node.js/Express, estructura completa, build OK |
