import { describe, it, expect } from 'vitest';
import { AbstractControl } from '@angular/forms';
import { emailValidator } from './email.validator';

function control(value: string | null): AbstractControl {
  return { value } as AbstractControl;
}

describe('emailValidator', () => {
  it('user@domain.com → null (válido)', () => {
    expect(emailValidator(control('user@domain.com'))).toBeNull();
  });

  it('user+tag@sub.domain.co.uk → null', () => {
    expect(emailValidator(control('user+tag@sub.domain.co.uk'))).toBeNull();
  });

  it('USER@DOMAIN.COM → null (insensible a mayúsculas)', () => {
    expect(emailValidator(control('USER@DOMAIN.COM'))).toBeNull();
  });

  it("notanemail → { invalidEmail: true }", () => {
    expect(emailValidator(control('notanemail'))).toEqual({ invalidEmail: true });
  });

  it('@domain.com → { invalidEmail: true }', () => {
    expect(emailValidator(control('@domain.com'))).toEqual({ invalidEmail: true });
  });

  it('user@ → { invalidEmail: true }', () => {
    expect(emailValidator(control('user@'))).toEqual({ invalidEmail: true });
  });

  it('user @domain.com (espacio) → { invalidEmail: true }', () => {
    expect(emailValidator(control('user @domain.com'))).toEqual({ invalidEmail: true });
  });

  it("'' (vacío) → null (Validators.required se encarga)", () => {
    expect(emailValidator(control(''))).toBeNull();
  });

  it('null → null', () => {
    expect(emailValidator(control(null))).toBeNull();
  });
});
