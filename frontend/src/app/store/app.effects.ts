import { Injectable, inject } from '@angular/core';
import { Actions } from '@ngrx/effects';

@Injectable()
export class AppEffects {
  private readonly actions$ = inject(Actions);
}
