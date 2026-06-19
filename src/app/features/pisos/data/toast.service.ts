import { Injectable, signal } from '@angular/core';

/**
 * Servicio mínimo de notificaciones tipo "toast".
 * El mensaje se expone como signal; el shell (`pisos.page`) lo pinta y se
 * oculta solo tras unos segundos.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Mensaje actual a mostrar (vacío = oculto). */
  readonly mensaje = signal('');

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /** Muestra un mensaje durante `duracion` ms (2,5 s por defecto). */
  mostrar(texto: string, duracion = 2500): void {
    this.mensaje.set(texto);
    if (this.temporizador) {
      clearTimeout(this.temporizador);
    }
    this.temporizador = setTimeout(() => this.mensaje.set(''), duracion);
  }
}
