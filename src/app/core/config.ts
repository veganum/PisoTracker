/**
 * Configuración del backend de persistencia.
 *
 * ── CÓMO ACTIVAR SUPABASE ──────────────────────────────────────────────
 * 1. En Supabase, crea la tabla `estado` + sus políticas RLS (ver SQL en el
 *    README / chat) y crea tu usuario en Authentication → Users.
 * 2. Pon `USAR_SUPABASE = true` aquí abajo.
 * Con `false` la app usa `localStorage` (no requiere login).
 * ───────────────────────────────────────────────────────────────────────
 */
export const USAR_SUPABASE = false;

/** Datos del proyecto Supabase (la `anonKey` es pública por diseño; RLS protege). */
export const SUPABASE_CONFIG = {
  url: 'https://spwssuibufaymhpggbii.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwd3NzdWlidWZheW1ocGdnYmlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5Nzk2MTYsImV4cCI6MjA5NzU1NTYxNn0.7h6xY9ORve_zN39Lj2egQ1iC4Wzy2sm8nT1y_AULkxQ',
};
