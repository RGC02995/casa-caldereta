import { Component, computed, effect, input, output, signal } from '@angular/core';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

export interface ISelectOption {
  readonly value:    string;
  readonly label:    string;
  readonly sublabel?: string;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Component({
  selector:    'searchable-select',
  imports:     [ClickOutsideDirective],
  templateUrl: './searchable-select.component.html',
  styleUrl:    './searchable-select.component.scss',
})
export class SearchableSelectComponent {
  readonly options     = input.required<readonly ISelectOption[]>();
  readonly value       = input<string>('');
  readonly placeholder = input('Buscar...');
  readonly id          = input('');
  readonly disabled    = input(false);
  readonly minChars    = input(0);
  readonly maxResults  = input(50);

  readonly valueChange = output<string>();

  readonly query  = signal('');
  readonly isOpen = signal(false);

  readonly selectedLabel = computed(() => {
    const match = this.options().find(o => o.value === this.value());
    return match ? this.formatOption(match) : '';
  });

  readonly filteredOptions = computed(() => {
    const normalizedQuery = normalize(this.query().trim());
    if (normalizedQuery.length < this.minChars()) return [];

    const scored = this.options()
      .map(option => {
        const normalizedLabel = normalize(option.label);
        const index = normalizedLabel.indexOf(normalizedQuery);
        return { option, index };
      })
      .filter(({ index }) => index !== -1)
      .sort((a, b) => a.index - b.index || a.option.label.localeCompare(b.option.label, 'es'));

    return scored.slice(0, this.maxResults()).map(({ option }) => option);
  });

  constructor() {
    // Sincroniza el texto mostrado con el valor seleccionado, salvo mientras el
    // usuario está escribiendo (el desplegable abierto marca edición en curso).
    effect(() => {
      if (!this.isOpen()) {
        this.query.set(this.selectedLabel());
      }
    });
  }

  private formatOption(option: ISelectOption): string {
    return option.sublabel ? `${option.label} (${option.sublabel})` : option.label;
  }

  onFocus(): void {
    if (this.disabled()) return;
    this.isOpen.set(true);
    this.query.set('');
  }

  onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.isOpen.set(true);
  }

  onSelect(option: ISelectOption): void {
    // Se fija el texto mostrado aquí mismo, sin esperar al round-trip por el
    // input `value` del padre: tras emit(), el padre actualiza su estado y lo
    // vuelve a pasar por binding, pero eso no ocurre hasta el siguiente ciclo
    // de detección de cambios — si solo se confiara en el effect() del
    // constructor, isOpen ya estaría a false y se leería el `value` todavía
    // desactualizado, mostrando la opción anterior en vez de la recién elegida.
    this.query.set(this.formatOption(option));
    this.valueChange.emit(option.value);
    this.isOpen.set(false);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.isOpen.set(false);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = this.filteredOptions()[0];
      if (first) this.onSelect(first);
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }
}
