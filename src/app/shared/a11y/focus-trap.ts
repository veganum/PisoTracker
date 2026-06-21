import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Atrapa el foco del teclado dentro del elemento (para diálogos modales):
 *   - Al montar, enfoca el primer elemento focusable interno.
 *   - `Tab`/`Shift+Tab` ciclan dentro del modal (no se escapan al fondo).
 *   - Al destruir, devuelve el foco a donde estaba antes de abrir el modal.
 *
 * Uso: `<div appFocusTrap tabindex="-1" role="dialog" aria-modal="true">…</div>`
 */
@Directive({
  selector: '[appFocusTrap]',
  host: { '(keydown)': 'alPulsar($event)' },
})
export class FocusTrap {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Elemento que tenía el foco antes de abrir el modal. */
  private readonly previo =
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

  constructor() {
    afterNextRender(() => {
      const focusables = this.focusables();
      (focusables[0] ?? this.host.nativeElement).focus();
    });
    inject(DestroyRef).onDestroy(() => this.previo?.focus?.());
  }

  alPulsar(ev: KeyboardEvent): void {
    if (ev.key !== 'Tab') {
      return;
    }
    const focusables = this.focusables();
    if (focusables.length === 0) {
      return;
    }
    const primero = focusables[0];
    const ultimo = focusables[focusables.length - 1];
    const activo = document.activeElement;

    if (ev.shiftKey && activo === primero) {
      ev.preventDefault();
      ultimo.focus();
    } else if (!ev.shiftKey && activo === ultimo) {
      ev.preventDefault();
      primero.focus();
    }
  }

  /** Elementos focusables y visibles dentro del modal. */
  private focusables(): HTMLElement[] {
    const selector =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => el.offsetParent !== null,
    );
  }
}
