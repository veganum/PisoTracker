import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { GeocodingService } from '../../data/geocoding.service';
import { PisosStore } from '../../data/pisos.store';
import {
  colorEstado,
  ESTADOS_FLUJO,
  ESTADOS_LATERALES,
  ESTADOS_PIPELINE,
  EstadoPipeline,
} from '../../models/estado-pipeline';
import { FocusTrap } from '../../../../shared/a11y/focus-trap';
import { Icono } from '../../../../shared/icono/icono';
import { barriosDe, Distrito, DISTRITOS_NOMBRES } from '../../models/madrid';
import {
  ESTADOS_PISO,
  EstadoPiso,
  Piso,
  TIPOS_CONTACTO,
  TipoContacto,
} from '../../models/piso.model';

/**
 * Modal de alta/edición de un piso.
 *
 * Formulario "signal-first": cada campo es un signal y las validaciones son
 * `computed()`. El componente se monta/desmonta con `@if` desde el shell, de
 * modo que cada apertura crea una instancia fresca y `ngOnInit` siembra los
 * valores iniciales (piso a editar, o coordenadas del clic en el mapa).
 *
 * Validaciones:
 *   - Dirección obligatoria.
 *   - Si `estado === 'Agendado'` ⇒ fecha y hora de cita obligatoria.
 *   - Si `tipoContacto === 'Inmobiliaria'` ⇒ se muestra el campo del nombre.
 */
@Component({
  selector: 'app-piso-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, Icono, FocusTrap],
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div
      class="animar-fade fixed inset-0 z-[2000] flex flex-col bg-black/40 backdrop-blur-sm"
      (click)="cerrar.emit()"
    >
      <div
        class="animar-sheet mt-auto flex max-h-[94vh] flex-col rounded-t-3xl bg-bg shadow-2xl sm:m-auto sm:max-w-lg sm:rounded-3xl"
        (click)="$event.stopPropagation()"
        appFocusTrap
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="esEditar() ? 'Editar piso' : 'Nuevo piso'"
      >
        <!-- Tirador (estética iOS) -->
        <div class="flex justify-center pt-2.5 sm:hidden">
          <span class="h-1.5 w-10 rounded-full bg-border"></span>
        </div>

        <!-- Cabecera fija -->
        <header class="flex items-center justify-between px-5 py-3.5">
          <h2 class="text-xl font-bold text-text">
            {{ esEditar() ? 'Editar piso' : 'Nuevo piso' }}
          </h2>
          <button
            type="button"
            (click)="cerrar.emit()"
            aria-label="Cerrar"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted ring-1 ring-border transition active:scale-95"
          >
            <app-icono nombre="x" [tam]="18" />
          </button>
        </header>

        <!-- Cuerpo con scroll -->
        <div class="flex-1 space-y-6 overflow-y-auto px-4 pb-5 pt-1">
          <!-- ===== Localización ===== -->
          <section>
            <h3 class="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">
              📍 Localización
            </h3>
            <div class="tarjeta space-y-3 p-4">
              <label class="block">
                <span class="etiqueta">Dirección *</span>
                <input
                  type="text"
                  [value]="direccion()"
                  (input)="direccion.set(valor($event))"
                  placeholder="Calle, número…"
                  class="campo"
                  [class.border-danger]="!direccionValida()"
                />
                @if (!direccionValida()) {
                  <span class="mt-1 block text-xs text-danger">La dirección es obligatoria.</span>
                }
                <!-- Ubicación del punto del mapa (relacionada con la dirección) -->
                @if (buscandoDireccion()) {
                  <span class="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-primary">
                    <span class="animate-pulse">📍</span> Buscando dirección del punto…
                  </span>
                } @else {
                  <span class="mt-1.5 block px-1 text-xs text-muted">
                    📍 Punto en el mapa: {{ lat() | number: '1.4-4' }}, {{ lng() | number: '1.4-4' }}
                  </span>
                }
              </label>

              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="etiqueta">Distrito *</span>
                  <select
                    [value]="distrito()"
                    (change)="cambiarDistrito(valor($event))"
                    class="campo"
                    [class.border-danger]="!distritoValido()"
                  >
                    <option value="">Selecciona…</option>
                    @for (d of distritos; track d) {
                      <option [value]="d">{{ d }}</option>
                    }
                  </select>
                </label>

                <label class="block">
                  <span class="etiqueta">Barrio</span>
                  <select
                    [value]="barrio()"
                    (change)="barrio.set(valor($event))"
                    [disabled]="barriosDisponibles().length === 0"
                    class="campo disabled:opacity-50"
                  >
                    <option value="">(sin especificar)</option>
                    @for (b of barriosDisponibles(); track b) {
                      <option [value]="b">{{ b }}</option>
                    }
                  </select>
                </label>
              </div>
              @if (!distritoValido()) {
                <span class="-mt-1 block px-1 text-xs text-danger">El distrito es obligatorio.</span>
              }

              <label class="block">
                <span class="etiqueta">URL del anuncio</span>
                <input
                  type="url"
                  inputmode="url"
                  [value]="url()"
                  (input)="url.set(valor($event))"
                  placeholder="https://…"
                  class="campo"
                  [class.border-danger]="!urlValida()"
                />
                @if (!urlValida()) {
                  <span class="mt-1 block text-xs text-danger">Debe empezar por http:// o https://</span>
                }
              </label>
            </div>
          </section>

          <!-- ===== Inmueble ===== -->
          <section>
            <h3 class="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">
              🏠 Inmueble
            </h3>
            <div class="tarjeta space-y-3 p-4">
              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="etiqueta">Precio (€)</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    step="1000"
                    [value]="precio()"
                    (input)="precio.set(num($event))"
                    class="campo"
                    [class.border-danger]="!precioValido()"
                  />
                  @if (!precioValido()) {
                    <span class="mt-1 block text-xs text-danger">Mayor que 0.</span>
                  }
                </label>
                <label class="block">
                  <span class="etiqueta">Metros (m²)</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    step="1"
                    [value]="metros()"
                    (input)="metros.set(num($event))"
                    class="campo"
                    [class.border-danger]="!metrosValido()"
                  />
                  @if (!metrosValido()) {
                    <span class="mt-1 block text-xs text-danger">Mayor que 0.</span>
                  }
                </label>
                <label class="block">
                  <span class="etiqueta">Habitaciones</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    step="1"
                    [value]="habitaciones()"
                    (input)="habitaciones.set(num($event))"
                    class="campo"
                    [class.border-danger]="!habitacionesValido()"
                  />
                  @if (!habitacionesValido()) {
                    <span class="mt-1 block text-xs text-danger">Mínimo 1.</span>
                  }
                </label>
                <label class="block">
                  <span class="etiqueta">Baños</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    step="1"
                    [value]="banos()"
                    (input)="banos.set(num($event))"
                    class="campo"
                    [class.border-danger]="!banosValido()"
                  />
                  @if (!banosValido()) {
                    <span class="mt-1 block text-xs text-danger">Mínimo 1.</span>
                  }
                </label>
                <label class="block">
                  <span class="etiqueta">Planta</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="-2"
                    max="60"
                    step="1"
                    [value]="planta()"
                    (input)="planta.set(num($event))"
                    class="campo"
                  />
                </label>
                <label
                  class="flex items-center gap-3 self-end rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <input
                    type="checkbox"
                    [checked]="ascensor()"
                    (change)="ascensor.set(marcado($event))"
                    class="h-5 w-5 accent-primary-btn"
                  />
                  <span class="text-base font-medium text-text">Ascensor</span>
                </label>
              </div>

              <div>
                <span class="etiqueta">Estado del piso</span>
                <div class="flex gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-border">
                  @for (e of estadosPiso; track e) {
                    <button
                      type="button"
                      (click)="estadoPiso.set(e)"
                      class="flex-1 rounded-xl py-2 text-xs font-semibold transition"
                      [class.bg-surface]="estadoPiso() === e"
                      [class.text-text]="estadoPiso() === e"
                      [class.shadow-sm]="estadoPiso() === e"
                      [class.text-muted]="estadoPiso() !== e"
                    >
                      {{ e }}
                    </button>
                  }
                </div>
              </div>
            </div>
          </section>

          <!-- ===== Contacto ===== -->
          <section>
            <h3 class="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">
              📞 Contacto
            </h3>
            <div class="tarjeta space-y-3 p-4">
              <div>
                <span class="etiqueta">Tipo de contacto</span>
                <div class="flex gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-border">
                  @for (t of tiposContacto; track t) {
                    <button
                      type="button"
                      (click)="tipoContacto.set(t)"
                      class="flex-1 rounded-xl py-2 text-sm font-semibold transition"
                      [class.bg-surface]="tipoContacto() === t"
                      [class.text-text]="tipoContacto() === t"
                      [class.shadow-sm]="tipoContacto() === t"
                      [class.text-muted]="tipoContacto() !== t"
                    >
                      {{ t }}
                    </button>
                  }
                </div>
              </div>

              @if (esInmobiliaria()) {
                <div class="block">
                  <span class="etiqueta">Nombre de la inmobiliaria</span>
                  <div class="relative">
                    <input
                      type="text"
                      [value]="inmobiliaria()"
                      (input)="inmobiliaria.set(valor($event)); mostrarSugerencias.set(true)"
                      (focus)="mostrarSugerencias.set(true)"
                      (blur)="cerrarSugerenciasDiferido()"
                      placeholder="Ej. Tecnocasa Usera"
                      class="campo pr-10"
                      autocomplete="off"
                    />
                    @if (inmobiliariasExistentes().length > 0) {
                      <span
                        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted transition"
                        [class.rotate-180]="mostrarSugerencias()"
                        >▾</span
                      >
                    }

                    @if (mostrarSugerencias() && sugerenciasInmobiliaria().length > 0) {
                      <ul
                        class="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-auto rounded-2xl bg-surface p-1 shadow-xl ring-1 ring-border"
                      >
                        @for (nombre of sugerenciasInmobiliaria(); track nombre) {
                          <li>
                            <button
                              type="button"
                              (mousedown)="$event.preventDefault()"
                              (click)="elegirInmobiliaria(nombre)"
                              class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-text transition hover:bg-surface-2"
                            >
                              🏢 {{ nombre }}
                            </button>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                  @if (inmobiliariasExistentes().length > 0) {
                    <span class="mt-1.5 block px-1 text-xs text-muted">
                      Elige una existente o escribe una nueva.
                    </span>
                  }
                </div>
              }
            </div>
          </section>

          <!-- ===== Costes y riesgos ===== -->
          <section>
            <h3 class="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">
              💶 Costes y riesgos
            </h3>
            <div class="tarjeta space-y-3 p-4">
              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="etiqueta">Comunidad (€/mes)</span>
                  <input type="number" inputmode="numeric" min="0" [value]="gastosComunidad()" (input)="gastosComunidad.set(num($event))" class="campo" />
                </label>
                <label class="block">
                  <span class="etiqueta">IBI (€/año)</span>
                  <input type="number" inputmode="numeric" min="0" [value]="ibiAnual()" (input)="ibiAnual.set(num($event))" class="campo" />
                </label>
                <label class="block">
                  <span class="etiqueta">Reforma estimada (€)</span>
                  <input type="number" inputmode="numeric" min="0" step="1000" [value]="reformaEstimada()" (input)="reformaEstimada.set(num($event))" class="campo" />
                </label>
                <label class="block">
                  <span class="etiqueta">Cert. energético (A–G)</span>
                  <input type="text" maxlength="1" [value]="certificadoEnergetico()" (input)="certificadoEnergetico.set(valor($event).toUpperCase())" placeholder="—" class="campo uppercase" />
                </label>
                <label class="block">
                  <span class="etiqueta">Metro (min)</span>
                  <input type="number" inputmode="numeric" min="0" [value]="minutosMetro()" (input)="minutosMetro.set(num($event))" class="campo" />
                </label>
                <label class="block">
                  <span class="etiqueta">Bus (min)</span>
                  <input type="number" inputmode="numeric" min="0" [value]="minutosBus()" (input)="minutosBus.set(num($event))" class="campo" />
                </label>
              </div>

              <label class="block">
                <span class="etiqueta">Derramas conocidas</span>
                <input type="text" [value]="derramas()" (input)="derramas.set(valor($event))" placeholder="Vacío = ninguna" class="campo" />
              </label>

              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                  <input type="checkbox" [checked]="ocupado()" (change)="ocupado.set(marcado($event))" class="h-5 w-5 accent-primary-btn" />
                  <span class="text-sm font-medium text-text">Ocupado</span>
                </label>
                <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
                  <input type="checkbox" [checked]="nudaPropiedad()" (change)="nudaPropiedad.set(marcado($event))" class="h-5 w-5 accent-primary-btn" />
                  <span class="text-sm font-medium text-text">Nuda propiedad</span>
                </label>
              </div>

              <label class="block">
                <span class="etiqueta">Observaciones legales</span>
                <input type="text" [value]="observacionesLegales()" (input)="observacionesLegales.set(valor($event))" placeholder="Cargas, ocupación, urbanísticas…" class="campo" />
              </label>

              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="etiqueta">Publicado</span>
                  <input type="date" [value]="fechaPublicacion()" (input)="fechaPublicacion.set(valor($event))" class="campo" />
                </label>
                <label class="block">
                  <span class="etiqueta">Última revisión</span>
                  <input type="date" [value]="fechaUltimaRevision()" (input)="fechaUltimaRevision.set(valor($event))" class="campo" />
                </label>
              </div>
            </div>
          </section>

          <!-- ===== Gestión ===== -->
          <section>
            <h3 class="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">
              📌 Gestión
            </h3>
            <div class="tarjeta space-y-3 p-4">
              <div>
                <span class="etiqueta">Estado en el pipeline</span>

                <!-- Stepper del flujo lineal -->
                <div class="flex items-center px-1">
                  @for (e of estadosFlujo; track e.valor; let i = $index; let primero = $first) {
                    @if (!primero) {
                      <span
                        class="h-0.5 flex-1 rounded transition-colors"
                        [style.background-color]="i <= indiceFlujo() ? e.color : 'var(--color-border)'"
                      ></span>
                    }
                    <button
                      type="button"
                      (click)="estado.set(e.valor)"
                      [attr.aria-label]="e.valor"
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition"
                      [style.border-color]="i <= indiceFlujo() ? e.color : 'var(--color-border)'"
                      [style.background-color]="i <= indiceFlujo() ? e.color : 'transparent'"
                      [class.text-white]="i <= indiceFlujo()"
                      [class.text-muted]="i > indiceFlujo()"
                    >
                      {{ i < indiceFlujo() ? '✓' : i + 1 }}
                    </button>
                  }
                </div>

                <!-- Estado actual + significado -->
                <p class="mt-2 text-center text-sm font-semibold" [style.color]="colorActual()">
                  {{ estado() }}
                </p>
                <p class="text-center text-xs text-muted">{{ significadoEstado() }}</p>

                <!-- Estados laterales (no son fase del flujo) -->
                <div class="mt-3 flex flex-wrap justify-center gap-2">
                  @for (e of estadosLaterales; track e.valor) {
                    <button
                      type="button"
                      (click)="estado.set(e.valor)"
                      class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95"
                      [style.background-color]="estado() === e.valor ? e.color : 'transparent'"
                      [style.border-color]="e.color"
                      [class.text-white]="estado() === e.valor"
                      [class.text-text]="estado() !== e.valor"
                    >
                      {{ e.icono }} {{ e.valor }}
                    </button>
                  }
                </div>
              </div>

              @if (citaRequerida()) {
                <label class="block">
                  <span class="etiqueta">Fecha y hora de la cita *</span>
                  <input
                    type="datetime-local"
                    [value]="fechaCita()"
                    (input)="fechaCita.set(valor($event))"
                    class="campo"
                    [class.border-danger]="!citaValida()"
                  />
                  @if (!citaValida()) {
                    <span class="mt-1 block text-xs text-danger">
                      Al estar "Agendado" debes indicar la fecha y hora.
                    </span>
                  }
                </label>
              }

              <label class="block">
                <span class="etiqueta">Notas</span>
                <textarea
                  rows="3"
                  [value]="notas()"
                  (input)="notas.set(valor($event))"
                  placeholder="Impresiones, pegas, cosas a preguntar…"
                  class="campo resize-none"
                ></textarea>
              </label>
            </div>
          </section>
        </div>

        <!-- Pie fijo -->
        <footer class="border-t border-border px-4 py-3.5">
          <button type="button" (click)="onGuardar()" [disabled]="!formValido()" class="btn-primario w-full">
            {{ esEditar() ? 'Guardar cambios' : 'Añadir piso' }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class PisoForm implements OnInit {
  /** Piso a editar (null = alta nueva). */
  readonly pisoInicial = input<Piso | null>(null);
  /** Coordenadas iniciales (clic en el mapa) para un alta nueva. */
  readonly coords = input<{ lat: number; lng: number } | null>(null);

  readonly guardar = output<Piso>();
  readonly cerrar = output<void>();

  private readonly geocoding = inject(GeocodingService);
  private readonly store = inject(PisosStore);

  /** Indica que se está resolviendo la dirección del punto del mapa. */
  readonly buscandoDireccion = signal(false);

  /** Inmobiliarias ya conocidas (detectadas + creadas a mano) para sugerir. */
  readonly inmobiliariasExistentes = this.store.nombresInmobiliariasSugeridas;

  /** Visibilidad del desplegable de sugerencias de inmobiliaria. */
  readonly mostrarSugerencias = signal(false);

  /** Sugerencias filtradas según lo escrito (todas si el campo está vacío). */
  readonly sugerenciasInmobiliaria = computed(() => {
    const q = this.inmobiliaria().trim().toLowerCase();
    const todas = this.inmobiliariasExistentes();
    return q ? todas.filter((n) => n.toLowerCase().includes(q)) : todas;
  });

  // Opciones para los selectores
  readonly distritos = DISTRITOS_NOMBRES;
  readonly estadosPiso = ESTADOS_PISO;
  readonly tiposContacto = TIPOS_CONTACTO;
  readonly estadosPipeline = ESTADOS_PIPELINE;
  readonly estadosFlujo = ESTADOS_FLUJO;
  readonly estadosLaterales = ESTADOS_LATERALES;

  // --- Estado del formulario (un signal por campo) ---
  readonly direccion = signal('');
  readonly distrito = signal<Distrito | ''>('');
  readonly barrio = signal('');
  readonly url = signal('');
  readonly precio = signal(0);
  readonly metros = signal(0);
  readonly habitaciones = signal(1);
  readonly banos = signal(1);
  readonly planta = signal(0);
  readonly ascensor = signal(false);
  readonly estadoPiso = signal<EstadoPiso>('Listo para entrar');
  readonly tipoContacto = signal<TipoContacto>('Particular');
  readonly inmobiliaria = signal('');
  // Costes / transporte / riesgos / otros
  readonly gastosComunidad = signal(0);
  readonly ibiAnual = signal(0);
  readonly derramas = signal('');
  readonly reformaEstimada = signal(0);
  readonly minutosMetro = signal(0);
  readonly minutosBus = signal(0);
  readonly ocupado = signal(false);
  readonly nudaPropiedad = signal(false);
  readonly observacionesLegales = signal('');
  readonly certificadoEnergetico = signal('');
  readonly fechaPublicacion = signal('');
  readonly fechaUltimaRevision = signal('');
  readonly estado = signal<EstadoPipeline>('Interesado');
  readonly fechaCita = signal('');
  readonly notas = signal('');
  readonly lat = signal(40.4168);
  readonly lng = signal(-3.7038);

  /** Barrios del distrito seleccionado (vacío si no hay distrito). */
  readonly barriosDisponibles = computed(() => barriosDe(this.distrito()));

  // --- Validaciones (computed) ---
  readonly esEditar = computed(() => this.pisoInicial() !== null);
  readonly direccionValida = computed(() => this.direccion().trim().length > 0);
  readonly distritoValido = computed(() => this.distrito() !== '');
  readonly precioValido = computed(() => this.precio() > 0);
  readonly metrosValido = computed(() => this.metros() > 0);
  readonly habitacionesValido = computed(() => this.habitaciones() >= 1);
  readonly banosValido = computed(() => this.banos() >= 1);
  readonly urlValida = computed(() => {
    const u = this.url().trim();
    return !u || /^https?:\/\/\S+$/i.test(u);
  });
  readonly citaRequerida = computed(() => this.estado() === 'Agendado');
  readonly citaValida = computed(() => !this.citaRequerida() || this.fechaCita().trim().length > 0);
  readonly esInmobiliaria = computed(() => this.tipoContacto() === 'Inmobiliaria');
  // Solo bloquean el guardado los campos REALMENTE obligatorios (dirección,
  // distrito y, si está Agendado, la cita). Precio/metros/hab/baños/URL se
  // marcan como aviso suave pero NO impiden guardar (p. ej. un piso recién
  // visto del que aún no sabes todos los datos, o pisos antiguos con 0).
  readonly formValido = computed(
    () => this.direccionValida() && this.distritoValido() && this.citaValida(),
  );
  /** Significado del estado seleccionado (texto de ayuda). */
  readonly significadoEstado = computed(
    () => this.estadosPipeline.find((e) => e.valor === this.estado())?.significado ?? '',
  );

  /** Índice del estado actual en el flujo lineal (-1 si es un estado lateral). */
  readonly indiceFlujo = computed(() =>
    this.estadosFlujo.findIndex((e) => e.valor === this.estado()),
  );

  /** Color del estado actual (para la etiqueta del stepper). */
  readonly colorActual = computed(() => colorEstado(this.estado()));

  ngOnInit(): void {
    const p = this.pisoInicial();
    if (p) {
      // Siembra desde el piso a editar
      this.direccion.set(p.direccion);
      this.distrito.set(p.distrito);
      this.barrio.set(p.barrio);
      this.url.set(p.url);
      this.precio.set(p.precio);
      this.metros.set(p.metros);
      this.habitaciones.set(p.habitaciones);
      this.banos.set(p.banos);
      this.planta.set(p.planta);
      this.ascensor.set(p.ascensor);
      this.estadoPiso.set(p.estadoPiso);
      this.tipoContacto.set(p.tipoContacto);
      this.inmobiliaria.set(p.inmobiliaria ?? '');
      this.gastosComunidad.set(p.gastosComunidad);
      this.ibiAnual.set(p.ibiAnual);
      this.derramas.set(p.derramas);
      this.reformaEstimada.set(p.reformaEstimada);
      this.minutosMetro.set(p.minutosMetro);
      this.minutosBus.set(p.minutosBus);
      this.ocupado.set(p.ocupado);
      this.nudaPropiedad.set(p.nudaPropiedad);
      this.observacionesLegales.set(p.observacionesLegales);
      this.certificadoEnergetico.set(p.certificadoEnergetico);
      this.fechaPublicacion.set(p.fechaPublicacion);
      this.fechaUltimaRevision.set(p.fechaUltimaRevision);
      this.estado.set(p.estado);
      this.fechaCita.set(p.fechaCita ?? '');
      this.notas.set(p.notas);
      this.lat.set(p.lat);
      this.lng.set(p.lng);
    } else {
      // Alta nueva: si venimos de un clic en el mapa, fijamos coordenadas
      // e intentamos autocompletar dirección y barrio (geocodificación inversa).
      const c = this.coords();
      if (c) {
        this.lat.set(c.lat);
        this.lng.set(c.lng);
        this.autocompletarDireccion(c.lat, c.lng);
      }
    }
  }

  /** Resuelve la calle/barrio del punto pinchado, sin pisar lo que escriba el usuario. */
  private autocompletarDireccion(lat: number, lng: number): void {
    this.buscandoDireccion.set(true);
    this.geocoding
      .reverse(lat, lng)
      .then(({ direccion, distrito, barrio }) => {
        // Solo rellenamos si el usuario no ha empezado a escribir la dirección.
        if (direccion && !this.direccion().trim()) {
          this.direccion.set(direccion);
        }
        // Distrito/barrio detectados: rellenamos si aún no hay distrito elegido.
        if (distrito && this.distrito() === '') {
          this.distrito.set(distrito);
          this.barrio.set(barrio ?? '');
        }
      })
      .finally(() => this.buscandoDireccion.set(false));
  }

  /** Construye el piso y lo emite (si el formulario es válido). */
  onGuardar(): void {
    if (!this.formValido()) {
      return;
    }
    const base = this.pisoInicial();
    const piso: Piso = {
      id: base?.id ?? crypto.randomUUID(),
      direccion: this.direccion().trim(),
      distrito: this.distrito() as Distrito, // validado: distritoValido() garantiza ≠ ''
      barrio: this.barrio(),
      url: this.url().trim(),
      precio: this.precio(),
      metros: this.metros(),
      habitaciones: this.habitaciones(),
      banos: this.banos(),
      planta: this.planta(),
      ascensor: this.ascensor(),
      estadoPiso: this.estadoPiso(),
      tipoContacto: this.tipoContacto(),
      inmobiliaria: this.esInmobiliaria() ? this.inmobiliaria().trim() || undefined : undefined,
      gastosComunidad: this.gastosComunidad(),
      ibiAnual: this.ibiAnual(),
      derramas: this.derramas().trim(),
      reformaEstimada: this.reformaEstimada(),
      minutosMetro: this.minutosMetro(),
      minutosBus: this.minutosBus(),
      ocupado: this.ocupado(),
      nudaPropiedad: this.nudaPropiedad(),
      observacionesLegales: this.observacionesLegales().trim(),
      certificadoEnergetico: this.certificadoEnergetico().trim().toUpperCase(),
      fechaPublicacion: this.fechaPublicacion(),
      fechaUltimaRevision: this.fechaUltimaRevision(),
      estado: this.estado(),
      fechaCita: this.fechaCita().trim() ? this.fechaCita() : undefined,
      notas: this.notas().trim(),
      lat: this.lat(),
      lng: this.lng(),
    };
    this.guardar.emit(piso);
  }

  /** Elige una inmobiliaria existente del desplegable. */
  elegirInmobiliaria(nombre: string): void {
    this.inmobiliaria.set(nombre);
    this.mostrarSugerencias.set(false);
  }

  /** Cierra el desplegable con un pequeño retardo (para no cortar el clic). */
  cerrarSugerenciasDiferido(): void {
    setTimeout(() => this.mostrarSugerencias.set(false), 120);
  }

  // --- Helpers de lectura de eventos del DOM (tipado estricto) ---
  valor(ev: Event): string {
    return (ev.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }
  num(ev: Event): number {
    const n = Number((ev.target as HTMLInputElement).value);
    return Number.isFinite(n) ? n : 0;
  }
  marcado(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }

  /** Cambia el distrito y resetea el barrio (los barrios dependen del distrito). */
  cambiarDistrito(valor: string): void {
    this.distrito.set(valor as Distrito | '');
    this.barrio.set('');
  }
}
