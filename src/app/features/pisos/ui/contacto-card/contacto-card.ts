import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Icono } from '../../../../shared/icono/icono';
import { PisosStore } from '../../data/pisos.store';
import { ToastService } from '../../data/toast.service';
import { Contacto, SUBTIPOS_FINANCIERA, UnidadHonorarios } from '../../models/contacto.model';
import { Distrito, DISTRITOS_NOMBRES } from '../../models/madrid';

@Component({
  selector: 'app-contacto-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [Icono],
  template: `
    <article class="tarjeta overflow-hidden">

      <!-- ── Cabecera ── -->
      <div class="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg">
          {{ esInmo() ? '🏢' : '🏦' }}
        </span>
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-base font-bold text-text">{{ contacto().nombre }}</h3>
          <span class="text-xs text-muted">
            {{ esInmo() ? 'Inmobiliaria' : 'Financiera · ' + contacto().subtipo }}
          </span>
        </div>
        @if (confirmandoBorrado()) {
          <div class="flex items-center gap-1.5">
            <button type="button" (click)="store.borrarContacto(contacto().nombre)"
              class="rounded-lg bg-danger px-2.5 py-1.5 text-sm font-semibold text-white active:scale-95">
              Borrar
            </button>
            <button type="button" (click)="confirmandoBorrado.set(false)"
              class="rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm text-muted ring-1 ring-border active:scale-95">
              Cancelar
            </button>
          </div>
        } @else {
          <button type="button" (click)="confirmandoBorrado.set(true)" aria-label="Borrar contacto"
            class="flex items-center justify-center rounded-lg bg-warning/15 px-2.5 py-2 text-warning ring-1 ring-warning/25 active:scale-95">
            <app-icono nombre="trash" [tam]="16" />
          </button>
        }
      </div>

      <!-- ── Valoración ── -->
      <div class="flex items-center gap-2 border-t border-border px-4 py-3">
        <span class="text-sm text-muted">Valoración</span>
        <div class="flex gap-0.5">
          @for (n of estrellas; track n) {
            <button type="button" (click)="guardar({ valoracion: contacto().valoracion === n ? 0 : n })"
              [attr.aria-label]="n + ' estrellas'" class="text-xl leading-none text-star">
              {{ n <= contacto().valoracion ? '★' : '☆' }}
            </button>
          }
        </div>
      </div>

      <!-- ── Tipo (solo financiera) ── -->
      @if (!esInmo()) {
        <div class="border-t border-border px-4 py-3">
          <div class="flex gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-border">
            @for (s of subtipos; track s) {
              <button type="button" (click)="guardar({ subtipo: s })"
                class="flex-1 rounded-xl py-2 text-sm font-semibold transition"
                [class.bg-surface]="contacto().subtipo === s"
                [class.text-text]="contacto().subtipo === s"
                [class.shadow-sm]="contacto().subtipo === s"
                [class.text-muted]="contacto().subtipo !== s">
                {{ s }}
              </button>
            }
          </div>
        </div>
      }

      <!-- ── Contacto ── -->
      <div class="space-y-3 border-t border-border px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Contacto</p>

        <label class="block">
          <span class="etiqueta">Persona de contacto</span>
          <input type="text" [value]="contacto().personaContacto"
            (change)="guardar({ personaContacto: valor($event) })"
            placeholder="Nombre del agente…" class="campo py-2.5" />
        </label>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span class="etiqueta">Teléfono</span>
            <div class="flex items-center gap-1.5">
              <input type="tel" [value]="contacto().telefono"
                (change)="guardar({ telefono: valor($event) })"
                placeholder="6XX XXX XXX" class="campo py-2.5" />
              @if (contacto().telefono.trim()) {
                <button type="button" (click)="copiar(contacto().telefono)"
                  aria-label="Copiar teléfono" class="btn-suave flex shrink-0 items-center px-3 py-2.5">
                  <app-icono nombre="copy" [tam]="16" />
                </button>
                <a [href]="'tel:' + contacto().telefono" aria-label="Llamar"
                  class="btn-suave flex shrink-0 items-center px-3 py-2.5">
                  <app-icono nombre="phone" [tam]="16" />
                </a>
              }
            </div>
          </div>
          <div>
            <span class="etiqueta">Email</span>
            <div class="flex items-center gap-1.5">
              <input type="email" [value]="contacto().email"
                (change)="guardar({ email: valor($event) })"
                placeholder="correo@…" class="campo py-2.5" />
              @if (contacto().email.trim()) {
                <button type="button" (click)="copiar(contacto().email)"
                  aria-label="Copiar email" class="btn-suave flex shrink-0 items-center px-3 py-2.5">
                  <app-icono nombre="copy" [tam]="16" />
                </button>
                <a [href]="'mailto:' + contacto().email" aria-label="Enviar email"
                  class="btn-suave flex shrink-0 items-center px-3 py-2.5">
                  <app-icono nombre="mail" [tam]="16" />
                </a>
              }
            </div>
          </div>
        </div>

        <div>
          <span class="etiqueta">Web</span>
          <div class="flex items-center gap-1.5">
            <input type="url" [value]="contacto().url"
              (change)="guardar({ url: valor($event) })"
              placeholder="https://…" class="campo py-2.5" />
            @if (contacto().url.trim()) {
              <a [href]="contacto().url" target="_blank" rel="noopener"
                class="btn-suave flex shrink-0 items-center px-3 py-2.5">
                <app-icono nombre="link" [tam]="16" />
              </a>
            }
          </div>
        </div>

        @if (esInmo()) {
          <label class="block">
            <span class="etiqueta">Dirección de la oficina</span>
            <input type="text" [value]="contacto().direccion"
              (change)="guardar({ direccion: valor($event) })"
              placeholder="Calle, número…" class="campo py-2.5" />
          </label>
        }
      </div>

      <!-- ── Distritos (inmobiliaria, colapsable) ── -->
      @if (esInmo()) {
        <div class="border-t border-border">
          <button type="button" (click)="mostrarDistritos.set(!mostrarDistritos())"
            class="flex w-full items-center justify-between px-4 py-3 text-left">
            <span class="text-xs font-semibold uppercase tracking-wide text-muted">
              Distritos donde trabaja
              @if (contacto().distritos.length) {
                <span class="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-primary">
                  {{ contacto().distritos.length }}
                </span>
              }
            </span>
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-muted transition-transform"
              [class.rotate-180]="mostrarDistritos()"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          @if (mostrarDistritos()) {
            <div class="flex flex-wrap gap-1.5 px-4 pb-3">
              @for (d of distritos; track d) {
                <button type="button" (click)="alternarDistrito(d)"
                  class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
                  [class.bg-primary-btn]="contacto().distritos.includes(d)"
                  [class.text-on-primary]="contacto().distritos.includes(d)"
                  [class.border-transparent]="contacto().distritos.includes(d)"
                  [class.text-muted]="!contacto().distritos.includes(d)"
                  [class.border-border]="!contacto().distritos.includes(d)">
                  {{ d }}
                </button>
              }
            </div>
          }
        </div>
      }

      <!-- ── Condiciones comerciales (colapsable) ── -->
      <div class="border-t border-border">
        <button type="button" (click)="mostrarCondiciones.set(!mostrarCondiciones())"
          class="flex w-full items-center justify-between px-4 py-3 text-left">
          <span class="text-xs font-semibold uppercase tracking-wide text-muted">
            Condiciones comerciales
          </span>
          <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-muted transition-transform"
            [class.rotate-180]="mostrarCondiciones()"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        @if (mostrarCondiciones()) {
          <div class="space-y-3 px-4 pb-4">

            @if (esInmo()) {
              <!-- INMOBILIARIA -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="etiqueta">Honorarios comprador</span>
                  <div class="flex items-center gap-1.5">
                    <input type="number" inputmode="decimal" [value]="contacto().honorariosComprador"
                      (change)="guardar({ honorariosComprador: num($event) })" class="campo py-2.5" />
                    <div class="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border">
                      @for (u of unidades; track u) {
                        <button type="button" (click)="guardar({ unidadComprador: u })"
                          class="rounded-lg px-2 py-1 text-sm font-semibold transition"
                          [class.bg-surface]="contacto().unidadComprador === u"
                          [class.text-text]="contacto().unidadComprador === u"
                          [class.text-muted]="contacto().unidadComprador !== u">
                          {{ u }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
                <div>
                  <span class="etiqueta">Honorarios vendedor</span>
                  <div class="flex items-center gap-1.5">
                    <input type="number" inputmode="decimal" [value]="contacto().honorariosVendedor"
                      (change)="guardar({ honorariosVendedor: num($event) })" class="campo py-2.5" />
                    <div class="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border">
                      @for (u of unidades; track u) {
                        <button type="button" (click)="guardar({ unidadVendedor: u })"
                          class="rounded-lg px-2 py-1 text-sm font-semibold transition"
                          [class.bg-surface]="contacto().unidadVendedor === u"
                          [class.text-text]="contacto().unidadVendedor === u"
                          [class.text-muted]="contacto().unidadVendedor !== u">
                          {{ u }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <label class="block">
                <span class="etiqueta">Servicio financiero</span>
                <input type="text" [value]="contacto().servicioFinanciero"
                  (change)="guardar({ servicioFinanciero: valor($event) })"
                  placeholder="Kiron, departamento propio, Banco propio… (vacío = no ofrece)"
                  class="campo py-2.5" />
              </label>

              <!-- Pills: Exclusiva -->
              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="guardar({ exclusiva: !contacto().exclusiva })"
                  class="rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95"
                  [class.bg-primary/15]="contacto().exclusiva"
                  [class.text-primary]="contacto().exclusiva"
                  [class.ring-primary/30]="contacto().exclusiva"
                  [class.bg-surface-2]="!contacto().exclusiva"
                  [class.text-muted]="!contacto().exclusiva"
                  [class.ring-border]="!contacto().exclusiva">
                  Trabaja con exclusiva
                </button>
              </div>
            } @else {
              <!-- FINANCIERA -->
              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="etiqueta">Financiación máx. (%)</span>
                  <input type="number" inputmode="numeric" [value]="contacto().financiacionMax"
                    (change)="guardar({ financiacionMax: num($event) })" class="campo py-2.5" />
                </label>
                <label class="block">
                  <span class="etiqueta">Plazo máximo (años)</span>
                  <input type="number" inputmode="numeric" [value]="contacto().plazoMaximo"
                    (change)="guardar({ plazoMaximo: num($event) })" class="campo py-2.5" />
                </label>
              </div>

              <!-- Hipoteca fija -->
              <div class="rounded-2xl bg-surface-2 p-3 ring-1 ring-border">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-semibold text-text">Hipoteca fija</span>
                  <button type="button" (click)="guardar({ hipotecaFija: !contacto().hipotecaFija })"
                    class="rounded-full px-3 py-1 text-xs font-semibold ring-1 transition"
                    [class.bg-primary/15]="contacto().hipotecaFija"
                    [class.text-primary]="contacto().hipotecaFija"
                    [class.ring-primary/30]="contacto().hipotecaFija"
                    [class.bg-surface]="!contacto().hipotecaFija"
                    [class.text-muted]="!contacto().hipotecaFija"
                    [class.ring-border]="!contacto().hipotecaFija">
                    {{ contacto().hipotecaFija ? 'Disponible' : 'No disponible' }}
                  </button>
                </div>
                @if (contacto().hipotecaFija) {
                  <label class="block">
                    <span class="etiqueta">TIN fijo ofrecido (%)</span>
                    <input type="number" inputmode="decimal" step="0.01"
                      [value]="contacto().tinFijo"
                      (change)="guardar({ tinFijo: num($event) })"
                      placeholder="Ej. 2.90" class="campo py-2.5" />
                  </label>
                }
              </div>

              <!-- Hipoteca variable / mixta -->
              <div class="rounded-2xl bg-surface-2 p-3 ring-1 ring-border">
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm font-semibold text-text">Hipoteca variable / mixta</span>
                  <button type="button" (click)="guardar({ hipotecaMixta: !contacto().hipotecaMixta })"
                    class="rounded-full px-3 py-1 text-xs font-semibold ring-1 transition"
                    [class.bg-primary/15]="contacto().hipotecaMixta"
                    [class.text-primary]="contacto().hipotecaMixta"
                    [class.ring-primary/30]="contacto().hipotecaMixta"
                    [class.bg-surface]="!contacto().hipotecaMixta"
                    [class.text-muted]="!contacto().hipotecaMixta"
                    [class.ring-border]="!contacto().hipotecaMixta">
                    {{ contacto().hipotecaMixta ? 'Disponible' : 'No disponible' }}
                  </button>
                </div>
                @if (contacto().hipotecaMixta) {
                  <label class="block">
                    <span class="etiqueta">Diferencial sobre Euríbor (%)</span>
                    <input type="number" inputmode="decimal" step="0.01"
                      [value]="contacto().diferencial"
                      (change)="guardar({ diferencial: num($event) })"
                      placeholder="Ej. 0.75 → Euríbor + 0.75%" class="campo py-2.5" />
                  </label>
                }
              </div>

              <div class="grid grid-cols-2 gap-3">
                <label class="block">
                  <span class="etiqueta">TAE orientativa (%)</span>
                  <input type="number" inputmode="decimal" step="0.01"
                    [value]="contacto().tae"
                    (change)="guardar({ tae: num($event) })"
                    placeholder="Ej. 3.15" class="campo py-2.5" />
                </label>
                <label class="block">
                  <span class="etiqueta">Aprobación (días)</span>
                  <input type="number" inputmode="numeric"
                    [value]="contacto().tiempoAprobacion"
                    (change)="guardar({ tiempoAprobacion: num($event) })" class="campo py-2.5" />
                </label>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <span class="etiqueta">Comisión apertura</span>
                  <div class="flex items-center gap-1.5">
                    <input type="number" inputmode="decimal"
                      [value]="contacto().comisionApertura"
                      (change)="guardar({ comisionApertura: num($event) })" class="campo py-2.5" />
                    <div class="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border">
                      @for (u of unidades; track u) {
                        <button type="button" (click)="guardar({ unidadComisionApertura: u })"
                          class="rounded-lg px-2 py-1 text-sm font-semibold transition"
                          [class.bg-surface]="contacto().unidadComisionApertura === u"
                          [class.text-text]="contacto().unidadComisionApertura === u"
                          [class.text-muted]="contacto().unidadComisionApertura !== u">
                          {{ u }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
                <label class="block">
                  <span class="etiqueta">Comisión intermediación (%)</span>
                  <input type="number" inputmode="decimal"
                    [value]="contacto().comisionIntermediacion"
                    (change)="guardar({ comisionIntermediacion: num($event) })" class="campo py-2.5" />
                </label>
              </div>

              <label class="block">
                <span class="etiqueta">Entidades con las que trabaja</span>
                <input type="text" [value]="contacto().entidades"
                  (change)="guardar({ entidades: valor($event) })"
                  placeholder="BBVA, Santander, ING…" class="campo py-2.5" />
              </label>

              <label class="block">
                <span class="etiqueta">Vinculaciones / productos exigidos</span>
                <input type="text" [value]="contacto().vinculaciones"
                  (change)="guardar({ vinculaciones: valor($event) })"
                  placeholder="Nómina, seguros, tarjeta…" class="campo py-2.5" />
              </label>

              <!-- Pills de características -->
              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="togglePill('financiaGastos')"
                  class="rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95"
                  [class.bg-primary/15]="contacto().financiaGastos"
                  [class.text-primary]="contacto().financiaGastos"
                  [class.ring-primary/30]="contacto().financiaGastos"
                  [class.bg-surface-2]="!contacto().financiaGastos"
                  [class.text-muted]="!contacto().financiaGastos"
                  [class.ring-border]="!contacto().financiaGastos">
                  Financia gastos
                </button>
                <button type="button" (click)="togglePill('preaprobacionOnline')"
                  class="rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95"
                  [class.bg-primary/15]="contacto().preaprobacionOnline"
                  [class.text-primary]="contacto().preaprobacionOnline"
                  [class.ring-primary/30]="contacto().preaprobacionOnline"
                  [class.bg-surface-2]="!contacto().preaprobacionOnline"
                  [class.text-muted]="!contacto().preaprobacionOnline"
                  [class.ring-border]="!contacto().preaprobacionOnline">
                  Preaprobación online
                </button>
                <button type="button" (click)="togglePill('registradoBdE')"
                  class="rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition active:scale-95"
                  [class.bg-primary/15]="contacto().registradoBdE"
                  [class.text-primary]="contacto().registradoBdE"
                  [class.ring-primary/30]="contacto().registradoBdE"
                  [class.bg-surface-2]="!contacto().registradoBdE"
                  [class.text-muted]="!contacto().registradoBdE"
                  [class.ring-border]="!contacto().registradoBdE">
                  Registrado BdE
                </button>
              </div>
            }

          </div>
        }
      </div>

      <!-- ── Observaciones ── -->
      <div class="border-t border-border px-4 py-3">
        <label class="block">
          <span class="etiqueta">Observaciones</span>
          <textarea rows="2" [value]="contacto().observaciones"
            (change)="guardar({ observaciones: valor($event) })"
            placeholder="Trato, condiciones, recordatorios…"
            class="campo resize-none py-2.5"></textarea>
        </label>
      </div>

    </article>
  `,
})
export class ContactoCard {
  protected readonly store = inject(PisosStore);
  private readonly toast = inject(ToastService);

  readonly contacto = input.required<Contacto>();
  readonly confirmandoBorrado = signal(false);
  readonly mostrarDistritos = signal(false);
  readonly mostrarCondiciones = signal(false);

  readonly distritos = DISTRITOS_NOMBRES;
  readonly subtipos = SUBTIPOS_FINANCIERA;
  readonly unidades: readonly UnidadHonorarios[] = ['€', '%'];
  readonly estrellas = [1, 2, 3, 4, 5];

  esInmo(): boolean {
    return this.contacto().tipo === 'Inmobiliaria';
  }

  guardar(cambios: Partial<Contacto>): void {
    this.store.guardarContacto({ ...this.contacto(), ...cambios });
  }

  alternarDistrito(d: Distrito): void {
    const actuales = this.contacto().distritos;
    const nuevos = actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d];
    this.guardar({ distritos: nuevos });
  }

  async copiar(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      this.toast.mostrar('Copiado ✓');
    } catch {
      this.toast.mostrar('No se pudo copiar');
    }
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  num(ev: Event): number {
    const n = Number((ev.target as HTMLInputElement).value);
    return Number.isFinite(n) ? n : 0;
  }

  togglePill(campo: 'financiaGastos' | 'preaprobacionOnline' | 'registradoBdE'): void {
    this.guardar({ [campo]: !this.contacto()[campo] } as Partial<Contacto>);
  }
}
