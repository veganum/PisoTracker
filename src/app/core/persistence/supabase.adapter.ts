import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { StoragePort } from './storage.port';

/**
 * Adaptador de persistencia sobre **Supabase** (Postgres + RLS).
 *
 * Modela un almacén CLAVE-VALOR por usuario en la tabla `estado`
 * (`user_id · clave · valor jsonb`). El `user_id` lo pone Postgres por defecto
 * (`auth.uid()`) y las políticas RLS garantizan que cada usuario solo accede a
 * lo suyo. Implementa el mismo puerto `StoragePort` que el adaptador local, así
 * que cambiar de uno a otro es una línea en `app.config.ts`.
 */
@Injectable()
export class SupabaseAdapter implements StoragePort {
  private readonly sb = inject(SupabaseService).client;
  private readonly tabla = 'estado';

  async cargar<T>(clave: string): Promise<T | null> {
    const { data, error } = await this.sb
      .from(this.tabla)
      .select('valor')
      .eq('clave', clave)
      .maybeSingle();
    if (error) {
      console.error('[Supabase] cargar', clave, error.message);
      return null;
    }
    return (data?.valor as T) ?? null;
  }

  async guardar<T>(clave: string, valor: T): Promise<void> {
    const { error } = await this.sb
      .from(this.tabla)
      .upsert({ clave, valor, actualizado_en: new Date().toISOString() }, { onConflict: 'user_id,clave' });
    if (error) {
      // Propagamos para que el SyncStatusService lo refleje en la UI.
      throw new Error(`Supabase guardar "${clave}": ${error.message}`);
    }
  }

  async borrar(clave: string): Promise<void> {
    const { error } = await this.sb.from(this.tabla).delete().eq('clave', clave);
    if (error) {
      throw new Error(`Supabase borrar "${clave}": ${error.message}`);
    }
  }
}
