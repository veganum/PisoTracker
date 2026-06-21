import { inject, Injectable } from '@angular/core';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { USAR_SUPABASE } from '../config';
import { SupabaseService } from './supabase.service';

/** Función que recibe el nuevo valor (deserializado) de una clave. */
type Manejador = (valor: unknown) => void;

/**
 * Sincronización EN VIVO con Supabase Realtime.
 *
 * Se suscribe a los cambios de la tabla `estado` del usuario (RLS) y, cuando
 * llega un cambio, avisa al manejador registrado para esa `clave`. Así, lo que
 * edita un dispositivo aparece en otro sin recargar.
 *
 * Requiere tener Realtime habilitado para la tabla `estado` en Supabase
 * (Database → Replication, o `alter publication supabase_realtime add table
 * public.estado;`). Si no, simplemente no se reciben eventos.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly sb = inject(SupabaseService).client;
  private readonly manejadores = new Map<string, Manejador>();
  private canal?: RealtimeChannel;

  constructor() {
    if (!USAR_SUPABASE) {
      return;
    }
    this.canal = this.sb
      .channel('estado-cambios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estado' },
        (payload) => {
          const fila = (payload.new ?? payload.old) as
            | { clave?: string; valor?: unknown }
            | undefined;
          if (fila?.clave) {
            this.manejadores.get(fila.clave)?.(fila.valor ?? null);
          }
        },
      )
      .subscribe();
  }

  /** Registra el manejador que refresca el estado local de una clave. */
  escuchar(clave: string, manejador: Manejador): void {
    this.manejadores.set(clave, manejador);
  }
}
