import { NgModule } from '@angular/core';
import { ViewProfessorComponent } from './containers/view-professor.component';
import { TurmaDetalheComponent } from './turma-detalhe/turma-detalhe.component';
import { ViewProfessorRoutingModule } from './view-professor-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    ViewProfessorComponent,
    TurmaDetalheComponent,
  ],
  imports: [
    ViewProfessorRoutingModule,
    SharedModule
  ],
  providers: []
})
export class ViewProfessorModule { }
