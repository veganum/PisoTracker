import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Icono } from '../../../../shared/icono/icono';
import { PisosStore } from '../../data/pisos.store';
import { ToastService } from '../../data/toast.service';
import { Contacto, SUBTIPOS_FINANCIERA, UnidadHonorarios } from '../../models/contacto.model';
import { Distrito, DISTRITOS_NOMBRES } from '../../models/madrid';

/**
 * Tarjeta editable de un contacto (inmobiliaria o financiera). Muestra los
 * campos según `tipo`. Teléfono y email se pueden copiar al portapapeles y
 * abrir en la app de teléfono/correo. Cada cambio persiste vía el store.
 */
@Component({
  selector: 'app-contacto-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  imports: [Icono],
  template: `
    <article class="tarjeta space-y-3 p-4">
      <!-- Cabecera: tipo + nombre + borrar -->
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-lg">
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
            <button
              type="button"
              (click)="store.borrarContacto(contacto().nombre)"
              class="rounded-lg bg-danger px-2.5 py-1.5 text-sm font-semibold text-white active:scale-95"
            >
              Borrar
            </button>
            <button
              type="button"
              (click)="confirmandoBorrado.set(false)"
              class="rounded-lg bg-surface-2 px-2.5 py-1.5 text-sm text-muted ring-1 ring-border active:scale-95"
            >
              Cancelar
            </button>
          </div>
        } @else {
          <button
            type="button"
            (click)="confirmandoBorrado.set(true)"
            aria-label="Borrar contacto"
            class="flex items-center justify-center rounded-lg bg-danger/10 px-2.5 py-1.5 text-danger active:scale-95"
          >
            <app-icono nombre="trash" [tam]="16" />
          </button>
        }
      </div>

      <!-- Valoración -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted">Valoración</span>
        <div class="flex gap-0.5">
          @for (n of estrellas; track n) {
            <button
              type="button"
              (click)="guardar({ valoracion: contacto().valoracion === n ? 0 : n })"
              [attr.aria-label]="n + ' estrellas'"
              class="text-xl leading-none text-star"
            >
              {{ n <= contacto().valoracion ? '★' : '☆' }}
            </button>
          }
        </div>
      </div>

      <!-- ===== Contacto común ===== -->
      <label class="block">
        <span class="etiqueta">Persona de contacto</span>
        <input
          type="text"
          [value]="contacto().personaContacto"
          (change)="guardar({ personaContacto: valor($event) })"
          placeholder="Nombre del agente…"
          class="campo py-2.5"
        />
      </label>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <span class="etiqueta">Teléfono</span>
          <div class="flex items-center gap-1.5">
            <input
              type="tel"
              [value]="contacto().telefono"
              (change)="guardar({ telefono: valor($event) })"
              placeholder="6XX XXX XXX"
              class="campo py-2.5"
            />
            @if (contacto().telefono.trim()) {
              <button type="button" (click)="copiar(contacto().telefono)" aria-label="Copiar teléfono" class="btn-suave flex shrink-0 items-center px-3 py-2.5"><app-icono nombre="copy" [tam]="16" /></button>
              <a [href]="'tel:' + contacto().telefono" aria-label="Llamar" class="btn-suave flex shrink-0 items-center px-3 py-2.5"><app-icono nombre="phone" [tam]="16" /></a>
            }
          </div>
        </div>
        <div>
          <span class="etiqueta">Email</span>
          <div class="flex items-center gap-1.5">
            <input
              type="email"
              [value]="contacto().email"
              (change)="guardar({ email: valor($event) })"
              placeholder="correo@…"
              class="campo py-2.5"
            />
            @if (contacto().email.trim()) {
              <button type="button" (click)="copiar(contacto().email)" aria-label="Copiar email" class="btn-suave flex shrink-0 items-center px-3 py-2.5"><app-icono nombre="copy" [tam]="16" /></button>
              <a [href]="'mailto:' + contacto().email" aria-label="Enviar email" class="btn-suave flex shrink-0 items-center px-3 py-2.5"><app-icono nombre="mail" [tam]="16" /></a>
            }
          </div>
        </div>
      </div>

      <label class="block">
        <span class="etiqueta">Web</span>
        <div class="flex items-center gap-1.5">
          <input
            type="url"
            [value]="contacto().url"
            (change)="guardar({ url: valor($event) })"
            placeholder="https://…"
            class="campo py-2.5"
          />
          @if (contacto().url.trim()) {
            <a [href]="contacto().url" target="_blank" rel="noopener" class="btn-suave flex shrink-0 items-center px-3 py-2.5"><app-icono nombre="link" [tam]="16" /></a>
          }
        </div>
      </label>

      <!-- ===== Específico INMOBILIARIA ===== -->
      @if (esInmo()) {
        <div>
          <span class="etiqueta">Distritos donde trabaja</span>
          <div class="flex flex-wrap gap-1.5">
            @for (d of distritos; track d) {
              <button
                type="button"
                (click)="alternarDistrito(d)"
                class="rounded-full border px-2.5 py-1 text-xs font-medium transition"
                [class.bg-primary-btn]="contacto().distritos.includes(d)"
                [class.text-on-primary]="contacto().distritos.includes(d)"
                [class.border-transparent]="contacto().distritos.includes(d)"
                [class.text-muted]="!contacto().distritos.includes(d)"
                [class.border-border]="!contacto().distritos.includes(d)"
              >
                {{ d }}
              </button>
            }
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="etiqueta">Honorarios comprador</span>
            <div class="flex items-center gap-1.5">
              <input type="number" inputmode="decimal" [value]="contacto().honorariosComprador" (change)="guardar({ honorariosComprador: num($event) })" class="campo py-2.5" />
              <div class="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border">
                @for (u of unidades; track u) {
                  <button type="button" (click)="guardar({ unidadComprador: u })" class="rounded-lg px-2 py-1 text-sm font-semibold transition" [class.bg-surface]="contacto().unidadComprador === u" [class.text-text]="contacto().unidadComprador === u" [class.text-muted]="contacto().unidadComprador !== u">{{ u }}</button>
                }
              </div>
            </div>
          </div>
          <div>
            <span class="etiqueta">Honorarios vendedor</span>
            <div class="flex items-center gap-1.5">
              <input type="number" inputmode="decimal" [value]="contacto().honorariosVendedor" (change)="guardar({ honorariosVendedor: num($event) })" class="campo py-2.5" />
              <div class="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border">
                @for (u of unidades; track u) {
                  <button type="button" (click)="guardar({ unidadVendedor: u })" class="rounded-lg px-2 py-1 text-sm font-semibold transition" [class.bg-surface]="contacto().unidadVendedor === u" [class.text-text]="contacto().unidadVendedor === u" [class.text-muted]="contacto().unidadVendedor !== u">{{ u }}</button>
                }
              </div>
            </div>
          </div>
        </div>

        <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
          <input type="checkbox" [checked]="contacto().exclusiva" (change)="guardar({ exclusiva: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
          <span class="text-base font-medium text-text">Trabaja con exclusiva</span>
        </label>
        <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
          <input type="checkbox" [checked]="contacto().financiacionPropia" (change)="guardar({ financiacionPropia: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
          <span class="text-base font-medium text-text">Financiación propia / Kiron</span>
        </label>

        <label class="block">
          <span class="etiqueta">Dirección</span>
          <input type="text" [value]="contacto().direccion" (change)="guardar({ direccion: valor($event) })" placeholder="Dirección de la oficina…" class="campo py-2.5" />
        </label>
      }

      <!-- ===== Específico FINANCIERA ===== -->
      @if (!esInmo()) {
        <div>
          <span class="etiqueta">Tipo</span>
          <div class="flex gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-border">
            @for (s of subtipos; track s) {
              <button type="button" (click)="guardar({ subtipo: s })" class="flex-1 rounded-xl py-2 text-sm font-semibold transition" [class.bg-surface]="contacto().subtipo === s" [class.text-text]="contacto().subtipo === s" [class.shadow-sm]="contacto().subtipo === s" [class.text-muted]="contacto().subtipo !== s">{{ s }}</button>
            }
          </div>
        </div>

        <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
          <input type="checkbox" [checked]="contacto().registradoBdE" (change)="guardar({ registradoBdE: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
          <span class="text-base font-medium text-text">Registrado en Banco de España</span>
        </label>

        <label class="block">
          <span class="etiqueta">Entidades con las que trabaja</span>
          <input type="text" [value]="contacto().entidades" (change)="guardar({ entidades: valor($event) })" placeholder="BBVA, Santander, ING…" class="campo py-2.5" />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="etiqueta">Financiación máx. (%)</span>
            <input type="number" inputmode="numeric" [value]="contacto().financiacionMax" (change)="guardar({ financiacionMax: num($event) })" class="campo py-2.5" />
          </label>
          <label class="block">
            <span class="etiqueta">Aprobación (días)</span>
            <input type="number" inputmode="numeric" [value]="contacto().tiempoAprobacion" (change)="guardar({ tiempoAprobacion: num($event) })" class="campo py-2.5" />
          </label>
          <label class="block">
            <span class="etiqueta">Comisión apertura</span>
            <input type="number" inputmode="decimal" [value]="contacto().comisionApertura" (change)="guardar({ comisionApertura: num($event) })" class="campo py-2.5" />
          </label>
          <label class="block">
            <span class="etiqueta">Comisión intermediación</span>
            <input type="number" inputmode="decimal" [value]="contacto().comisionIntermediacion" (change)="guardar({ comisionIntermediacion: num($event) })" class="campo py-2.5" />
          </label>
        </div>

        <label class="block">
          <span class="etiqueta">Vinculaciones / productos exigidos</span>
          <input type="text" [value]="contacto().vinculaciones" (change)="guardar({ vinculaciones: valor($event) })" placeholder="Nómina, seguros, tarjeta…" class="campo py-2.5" />
        </label>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <input type="checkbox" [checked]="contacto().financiaGastos" (change)="guardar({ financiaGastos: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
            <span class="text-sm font-medium text-text">Financia gastos (100%+)</span>
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <input type="checkbox" [checked]="contacto().preaprobacionOnline" (change)="guardar({ preaprobacionOnline: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
            <span class="text-sm font-medium text-text">Preaprobación online</span>
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <input type="checkbox" [checked]="contacto().hipotecaFija" (change)="guardar({ hipotecaFija: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
            <span class="text-sm font-medium text-text">Fija disponible</span>
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <input type="checkbox" [checked]="contacto().hipotecaMixta" (change)="guardar({ hipotecaMixta: marcado($event) })" class="h-5 w-5 accent-primary-btn" />
            <span class="text-sm font-medium text-text">Mixta disponible</span>
          </label>
        </div>
      }

      <!-- Observaciones (común) -->
      <label class="block">
        <span class="etiqueta">Observaciones</span>
        <textarea rows="2" [value]="contacto().observaciones" (change)="guardar({ observaciones: valor($event) })" placeholder="Trato, condiciones, recordatorios…" class="campo resize-none py-2.5"></textarea>
      </label>
    </article>
  `,
})
export class ContactoCard {
  protected readonly store = inject(PisosStore);
  private readonly toast = inject(ToastService);

  readonly contacto = input.required<Contacto>();

  /** Paso de confirmación antes de borrar el contacto. */
  readonly confirmandoBorrado = signal(false);

  readonly distritos = DISTRITOS_NOMBRES;
  readonly subtipos = SUBTIPOS_FINANCIERA;
  readonly unidades: readonly UnidadHonorarios[] = ['€', '%'];
  readonly estrellas = [1, 2, 3, 4, 5];

  /** Es una inmobiliaria (vs. financiera). */
  esInmo(): boolean {
    return this.contacto().tipo === 'Inmobiliaria';
  }

  /** Aplica un cambio parcial y lo persiste (upsert por nombre). */
  guardar(cambios: Partial<Contacto>): void {
    this.store.guardarContacto({ ...this.contacto(), ...cambios });
  }

  /** Añade/quita un distrito de la cobertura. */
  alternarDistrito(d: Distrito): void {
    const actuales = this.contacto().distritos;
    const nuevos = actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d];
    this.guardar({ distritos: nuevos });
  }

  /** Copia un texto al portapapeles y avisa con un toast. */
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
  marcado(ev: Event): boolean {
    return (ev.target as HTMLInputElement).checked;
  }
}
