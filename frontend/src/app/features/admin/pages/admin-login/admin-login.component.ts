import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector:    'admin-login',
  imports:     [],
  templateUrl: './admin-login.component.html',
  styleUrl:    './admin-login.component.scss',
})
export class AdminLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  readonly emailValue      = signal('');
  readonly passwordValue   = signal('');
  readonly emailTouched    = signal(false);
  readonly passwordTouched = signal(false);
  readonly isLoading         = signal(false);
  readonly errorMessage      = signal('');
  readonly passwordVisible   = signal(false);

  togglePasswordVisibility(): void {
    this.passwordVisible.update(visible => !visible);
  }

  readonly emailError = computed(() => {
    if (!this.emailTouched()) return '';
    const trimmedEmail = this.emailValue().trim();
    if (!trimmedEmail) return 'El correo es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return 'Introduce un correo válido.';
    return '';
  });

  readonly passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    if (!this.passwordValue()) return 'La contraseña es obligatoria.';
    if (this.passwordValue().length < 8) return 'Mínimo 8 caracteres.';
    return '';
  });

  readonly isFormValid = computed(() => {
    const trimmedEmail = this.emailValue().trim();
    const emailValid   = trimmedEmail !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    const passwordValid = this.passwordValue().length >= 8;
    return emailValid && passwordValid;
  });

  onSubmit(event: Event): void {
    event.preventDefault();
    this.emailTouched.set(true);
    this.passwordTouched.set(true);

    if (!this.isFormValid() || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({
      email:    this.emailValue().trim(),
      password: this.passwordValue(),
    }).subscribe({
      next: () => {
        void this.router.navigate(['/admin']);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.errorMessage.set('Credenciales incorrectas. Inténtalo de nuevo.');
        } else if (err.status === 429) {
          this.errorMessage.set('Demasiados intentos fallidos. Espera 15 minutos.');
        } else {
          this.errorMessage.set('Error del servidor. Inténtalo más tarde.');
        }
        this.isLoading.set(false);
      },
    });
  }
}
