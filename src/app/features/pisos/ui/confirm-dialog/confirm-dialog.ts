import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Diálogo modal de confirmación (usado antes de descartar/borrar un piso).
 * Es "tonto": recibe los textos y emite `confirmar` / `cancelar`.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="animar-fade fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
      (click)="cancelar.emit()"
    >
      <div
        class="animar-escala w-full max-w-sm rounded-3xl bg-surface p-5 text-center shadow-xl ring-1 ring-border"
        (click)="$event.stopPropagation()"
      >
        <div
          class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-2xl"
        >
          🗑️
        </div>
        <h2 class="text-lg font-bold text-text">{{ titulo() }}</h2>
        <p class="mt-1 text-sm text-muted">{{ mensaje() }}</p>
        <div class="mt-5 flex gap-3">
          <button type="button" (click)="cancelar.emit()" class="btn-suave flex-1">
            Cancelar
          </button>
          <button
            type="button"
            (click)="confirmar.emit()"
            class="flex-1 rounded-2xl bg-danger py-3 font-semibold text-white shadow-sm transition active:scale-[0.98]"
          >
            {{ textoConfirmar() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  readonly titulo = input('¿Seguro?');
  readonly mensaje = input('');
  readonly textoConfirmar = input('Descartar');

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
