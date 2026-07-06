import { NgModule } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
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
    SharedModule,
    A11yModule
  ],
  providers: []
})
export class ViewProfessorModule { }
