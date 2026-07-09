import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Exige: parte-local @ dominio . TLD (mín. 2 letras)
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export const emailValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const value = control.value as string | null | undefined;

  // Vacío: null — que Validators.required gestione este caso por separado
  if (!value) return null;

  return EMAIL_REGEX.test(value) ? null : { invalidEmail: true };
};
