import { NgModule } from '@angular/core';
import { InternoRoutingModule } from './interno-routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  // Sem componentes próprios: este módulo só agrupa as rotas internas (o layout de cada
  // tela é do próprio componente de rota).
  declarations: [],
  imports: [
    InternoRoutingModule,
    SharedModule
  ],
  exports: [],
  providers: [],
  bootstrap: []
})
export class InternoModule { }
