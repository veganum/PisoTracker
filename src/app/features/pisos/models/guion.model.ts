/** Una pregunta del guion, con su estado de "hecha". */
export interface PreguntaGuion {
  id: string;
  texto: string;
  hecha: boolean;
}

/** Un bloque de preguntas asociado a un momento de la compra. */
export interface BloqueGuion {
  id: string;
  icono: string;
  titulo: string;
  preguntas: PreguntaGuion[];
}
