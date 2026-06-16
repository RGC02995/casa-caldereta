# /barrido-señales — Auditoría reactiva del frontend Angular

Auditar todas las suscripciones RxJS en componentes de `frontend/src/app` y modernizarlas según los dos patrones objetivo del proyecto.

---

## Qué buscar

Buscar `subscribe(` en ficheros `.component.ts` únicamente. Excluir servicios, guards e interceptores — esos pueden tener patrones distintos y no son objeto de este barrido.

---

## Clasificación

### Tipo A — Carga de datos en init o método de recarga

**Criterio:** `subscribe()` llamado en el constructor, o en un método privado (`loadData()`, `loadAll()`, etc.) invocado desde el constructor o desde handlers que necesitan refrescar datos, para poblar señales con respuestas HTTP.

**Problema:** si el componente se destruye antes de que la petición responda, la callback `next` intenta actualizar una señal de un componente ya destruido. Además, si `loadData()` se llama varias veces rápido, las peticiones anteriores no se cancelan.

**Antes:**
```typescript
private loadData(): void {
  this.service.getAll().pipe(
    map(r => r.data),
    catchError(() => { this.error.set('...'); return of([]); }),
  ).subscribe(items => this.items.set(items));
}
```

**Después — patrón `BehaviorSubject + toSignal()`** (mismo que usan las páginas admin):
```typescript
import { BehaviorSubject, switchMap, of } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

private readonly refresh$ = new BehaviorSubject<void>(undefined);

readonly items = toSignal(
  this.refresh$.pipe(
    switchMap(() => this.service.getAll().pipe(
      map(r => r.data),
      catchError(() => { this.error.set('...'); return of([] as IItem[]); }),
    )),
  ),
  { initialValue: [] as IItem[] },
);

// Para recargar desde cualquier handler:
private reload(): void { this.refresh$.next(); }
```

`toSignal()` se encarga de cancelar la suscripción al destruir el componente. `switchMap` cancela la petición anterior si llega una nueva antes de que responda.

---

### Tipo B — Mutaciones en handlers de usuario

**Criterio:** `subscribe({ next, error })` dentro de métodos llamados por eventos del usuario (click, submit). HTTP completa solo, así que técnicamente no hay fuga — pero si el componente se destruye mientras la petición está en vuelo (ej: usuario navega antes de que responda), el callback `next`/`error` intenta actualizar señales de un componente destruido. `takeUntilDestroyed` evita ese caso y es el estándar Angular 17+.

**Antes:**
```typescript
onDelete(id: string): void {
  this.service.delete(id).subscribe({
    next:  () => { this.processingId.set(null); },
    error: () => { this.error.set('No se pudo eliminar.'); },
  });
}
```

**Después — inyectar `DestroyRef` y añadir `takeUntilDestroyed`:**
```typescript
import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// En la clase (campo o en constructor):
private readonly destroyRef = inject(DestroyRef);

onDelete(id: string): void {
  this.service.delete(id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next:  () => { this.processingId.set(null); },
      error: () => { this.error.set('No se pudo eliminar.'); },
    });
}
```

`DestroyRef` se inyecta una sola vez por componente aunque haya varios handlers.

---

### Ignorar — No modificar

- `subscribe()` sin callbacks `next`/`error` (fire-and-forget puro, como el logout de `AuthService`)
- Suscripciones en servicios `providedIn: 'root'` — viven toda la sesión del usuario, no hay componente que destruir
- Los `ngOnDestroy` existentes en `modal`, `gallery-lightbox`, `site-header` y `scroll-reveal` — son limpieza de eventos DOM, no de RxJS; están bien

---

## Proceso obligatorio

1. Leer el fichero completo antes de proponer ningún cambio
2. Mostrar **ANTES** (código actual) y **DESPUÉS** (código propuesto) con explicación clara de qué cambia y por qué
3. **Esperar aprobación explícita** antes de editar — no pasar al siguiente fichero sin confirmación
4. Un fichero a la vez
5. Al terminar todos los ficheros, marcar el barrido como completado en `CLAUDE.md`

---

## Orden de ejecución

Empezar por el Tipo A (más impacto) y luego continuar con los Tipo B:

1. `features/booking/pages/booking-page/booking-page.component.ts` — **Tipo A**
2. `features/admin/pages/admin-routes/admin-routes.component.ts` — Tipo B (3 handlers)
3. `features/admin/components/admin-calendar-panel/admin-calendar-panel.component.ts` — Tipo B (4 handlers)
4. `features/admin/components/admin-gallery-upload/admin-gallery-upload.component.ts` — Tipo B (1 handler)
5. `features/admin/pages/admin-gallery/admin-gallery.component.ts` — Tipo B (1 handler)
6. `features/admin/pages/admin-login/admin-login.component.ts` — Tipo B (1 handler)
7. `features/admin/pages/admin-reviews/admin-reviews.component.ts` — Tipo B (2 handlers)
8. `features/admin/pages/admin-bookings/admin-bookings.component.ts` — Tipo B (2 handlers)
9. `features/booking/components/booking-request-panel/booking-request-panel.component.ts` — Tipo B (1 handler)
10. `features/home/components/home-reviews/home-reviews.component.ts` — Tipo B (1 handler)
