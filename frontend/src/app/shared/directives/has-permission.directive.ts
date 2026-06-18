import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { UserRole } from '../../core/models/user.model';

@Directive({
  selector: '[hasPermission]',
})
export class HasPermissionDirective {
  private readonly templateRef      = inject(TemplateRef<unknown>);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly authService      = inject(AuthService);

  readonly hasPermission = input.required<UserRole | UserRole[]>();

  // Flag interno (no signal) — solo necesitamos saber si la vista ya está creada
  private hasView = false;

  constructor() {
    // El effect re-corre cuando cambia el usuario autenticado O el rol requerido
    effect(() => {
      const currentUser   = this.authService.currentUser();
      const requiredRoles = this.hasPermission();
      const roles         = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const hasAccess     = currentUser !== null && roles.includes(currentUser.role);

      if (hasAccess && !this.hasView) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!hasAccess && this.hasView) {
        this.viewContainerRef.clear();
        this.hasView = false;
      }
    });
  }
}
