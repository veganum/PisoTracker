import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PisosPage } from './features/pisos/pisos.page';

/** Componente raíz: monta el shell de la feature de pisos. */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PisosPage],
  template: `<app-pisos-page />`,
})
export class App {}
