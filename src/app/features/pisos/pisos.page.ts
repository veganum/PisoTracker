import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { USAR_SUPABASE } from '../../core/config';
import { ThemeService } from '../../core/theme/theme.service';
import { Icono } from '../../shared/icono/icono';
import { PisosStore } from './data/pisos.store';
import { SyncStatusService } from './data/sync-status.service';
import { ToastService } from './data/toast.service';
import { Piso } from './models/piso.model';
import { ConfirmDialog } from './ui/confirm-dialog/confirm-dialog';
import { FavoritosView } from './ui/favoritos-view/favoritos-view';
import { GuionView } from './ui/guion-view/guion-view';
import { InmobiliariasView } from './ui/inmobiliarias-view/inmobiliarias-view';
import { ListaView } from './ui/lista-view/lista-view';
import { MapaView } from './ui/mapa-view/mapa-view';
import { PisoForm } from './ui/piso-form/piso-form';

type Pestana = 'mapa' | 'lista' | 'favoritos' | 'agencias' | 'guion';

/** Definición de las pestañas inferiores. */
interface ConfigPestana {
  readonly id: Pestana;
  readonly icono: string;
  readonly etiqueta: string;
}

/**
 * Shell de la feature "pisos": cabecera, contenido por pestañas (mapa, lista,
 * favoritos, agencias), botón flotante de alta, modal de formulario, diálogo
 * de confirmación y toast de feedback. Orquesta las acciones contra el store.
 */
@Component({
  selector: 'app-pisos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MapaView,
    ListaView,
    FavoritosView,
    InmobiliariasView,
    GuionView,
    PisoForm,
    ConfirmDialog,
    Icono,
  ],
  template: `
    <div class="mx-auto flex h-[100dvh] max-w-lg flex-col bg-bg lg:max-w-6xl">
      <!-- Cabecera -->
      <header
        class="z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-lg"
      >
        <div class="flex items-center gap-2.5">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-btn text-lg shadow-sm"
          >
            🏠
          </span>
          <div>
            <h1 class="text-lg font-bold leading-none text-text">PisoTracker</h1>
            <p class="mt-0.5 text-xs text-muted">Búsqueda de piso en Madrid</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          @if (sync.estado() === 'guardando') {
            <span class="text-xs text-muted" title="Guardando…">⏳</span>
          } @else if (sync.estado() === 'error') {
            <span class="text-xs text-danger" title="Error al sincronizar">⚠️</span>
          }
          <span
            class="inline-flex h-9 items-center gap-1 rounded-full bg-surface-2 px-3 text-sm font-semibold text-text"
            [attr.title]="store.pisos().length + ' pisos guardados'"
            aria-label="Pisos guardados"
          >
            🏢 {{ store.pisos().length }}
          </span>
          <button
            type="button"
            (click)="theme.alternar()"
            [attr.aria-label]="theme.oscuro() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-border transition active:scale-90"
          >
            <app-icono [nombre]="theme.oscuro() ? 'sun' : 'moon'" [tam]="18" />
          </button>
          @if (mostrarLogout) {
            <button
              type="button"
              (click)="auth.salir()"
              aria-label="Cerrar sesión"
              class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-border transition active:scale-90"
            >
              <app-icono nombre="log-out" [tam]="18" />
            </button>
          }
        </div>
      </header>

      <!-- Contenido -->
      <main class="relative min-h-0 flex-1">
        @if (!store.cargado()) {
          <div class="flex h-full flex-col items-center justify-center gap-3 text-muted">
            <span class="text-3xl animate-pulse">🏠</span>
            <span class="text-sm">Cargando tus pisos…</span>
          </div>
        } @else {
        @switch (tab()) {
          @case ('mapa') {
            <app-mapa-view
              class="block h-full"
              (nuevo)="abrirNuevo($event)"
              (editar)="abrirEditar($event)"
              (borrar)="pedirBorrar($event)"
            />
          }
          @case ('lista') {
            <div class="h-full overflow-y-auto p-4 pb-24">
              <app-lista-view (editar)="abrirEditar($event)" (borrar)="pedirBorrar($event)" />
            </div>
          }
          @case ('favoritos') {
            <div class="h-full overflow-y-auto p-4 pb-24">
              <app-favoritos-view (editar)="abrirEditar($event)" (borrar)="pedirBorrar($event)" />
            </div>
          }
          @case ('agencias') {
            <div class="h-full overflow-y-auto p-4 pb-24">
              <app-inmobiliarias-view />
            </div>
          }
          @case ('guion') {
            <div class="h-full overflow-y-auto p-4 pb-24">
              <app-guion-view />
            </div>
          }
        }

        <!-- Botón flotante de alta (solo en Mapa y Lista, donde tiene sentido) -->
        @if (tab() === 'mapa' || tab() === 'lista') {
        <button
          type="button"
          (click)="abrirNuevo(null)"
          aria-label="Añadir piso"
          class="absolute bottom-5 right-5 z-[1100] flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-btn text-on-primary shadow-lg shadow-primary/30 transition active:scale-90"
        >
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        }
        }
      </main>

      <!-- Pestañas inferiores fijas -->
      <nav
        class="z-20 grid grid-cols-5 border-t border-border bg-surface/90 px-1 pt-1.5 backdrop-blur-lg"
        style="padding-bottom: calc(0.25rem + env(safe-area-inset-bottom))"
      >
        @for (p of pestanas; track p.id) {
          <button
            type="button"
            (click)="tab.set(p.id)"
            class="flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium whitespace-nowrap transition"
            [class.text-primary]="tab() === p.id"
            [class.text-muted]="tab() !== p.id"
          >
            <span
              class="flex h-7 w-11 items-center justify-center rounded-full text-lg transition"
              [class.tab-activa]="tab() === p.id"
            >
              {{ p.icono }}
            </span>
            {{ p.etiqueta }}
          </button>
        }
      </nav>
    </div>

    <!-- Modal de alta/edición -->
    @if (formAbierto()) {
      <app-piso-form
        [pisoInicial]="pisoEditar()"
        [coords]="coordsNuevas()"
        (guardar)="onGuardar($event)"
        (cerrar)="cerrarForm()"
      />
    }

    <!-- Confirmación de borrado -->
    @if (pisoBorrar(); as p) {
      <app-confirm-dialog
        titulo="Descartar piso"
        [mensaje]="'Se eliminará definitivamente «' + p.direccion + '». Esta acción no se puede deshacer.'"
        textoConfirmar="Descartar"
        (confirmar)="confirmarBorrar()"
        (cancelar)="cancelarBorrar()"
      />
    }

    <!-- Toast de feedback -->
    @if (toast.mensaje(); as msg) {
      <div
        class="animar-toast fixed bottom-24 left-1/2 z-[2200] flex -translate-x-1/2 items-center gap-2 rounded-full bg-text px-5 py-2.5 text-sm font-medium text-bg shadow-lg"
      >
        ✓ {{ msg }}
      </div>
    }
  `,
})
export class PisosPage {
  protected readonly store = inject(PisosStore);
  protected readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  protected readonly sync = inject(SyncStatusService);

  /** Muestra el botón de cerrar sesión solo cuando hay login (Supabase). */
  protected readonly mostrarLogout = USAR_SUPABASE;

  /** Pestaña activa. */
  readonly tab = signal<Pestana>('mapa');

  // Estado del modal de formulario
  readonly formAbierto = signal(false);
  readonly pisoEditar = signal<Piso | null>(null);
  readonly coordsNuevas = signal<{ lat: number; lng: number } | null>(null);

  // Estado del diálogo de confirmación
  readonly pisoBorrar = signal<Piso | null>(null);

  readonly pestanas: readonly ConfigPestana[] = [
    { id: 'mapa', icono: '🗺️', etiqueta: 'Mapa' },
    { id: 'lista', icono: '📋', etiqueta: 'Lista' },
    { id: 'favoritos', icono: '⭐', etiqueta: 'Favoritos' },
    { id: 'agencias', icono: '🏢', etiqueta: 'Inmob.' },
    { id: 'guion', icono: '📝', etiqueta: 'Guion' },
  ];

  // --- Formulario ---

  /** Abre el formulario en modo alta (con coordenadas opcionales del mapa). */
  abrirNuevo(coords: { lat: number; lng: number } | null): void {
    this.pisoEditar.set(null);
    this.coordsNuevas.set(coords);
    this.formAbierto.set(true);
  }

  /** Abre el formulario en modo edición. */
  abrirEditar(piso: Piso): void {
    this.pisoEditar.set(piso);
    this.coordsNuevas.set(null);
    this.formAbierto.set(true);
  }

  cerrarForm(): void {
    this.formAbierto.set(false);
  }

  /** Guarda (alta o edición) según el modo y muestra feedback. */
  onGuardar(piso: Piso): void {
    if (this.pisoEditar()) {
      this.store.actualizar(piso);
      this.toast.mostrar('Piso actualizado');
    } else {
      this.store.añadir(piso);
      this.toast.mostrar('Piso añadido');
    }
    this.cerrarForm();
  }

  // --- Borrado ---

  pedirBorrar(piso: Piso): void {
    this.pisoBorrar.set(piso);
  }

  confirmarBorrar(): void {
    const piso = this.pisoBorrar();
    if (piso) {
      this.store.borrar(piso.id);
      this.toast.mostrar('Piso descartado');
    }
    this.pisoBorrar.set(null);
  }

  cancelarBorrar(): void {
    this.pisoBorrar.set(null);
  }
}
