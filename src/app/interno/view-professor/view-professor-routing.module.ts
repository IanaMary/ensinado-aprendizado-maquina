import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewProfessorComponent } from './containers/view-professor.component';
import { TurmaDetalheComponent } from './turma-detalhe/turma-detalhe.component';

const routes: Routes = [
  {
    path: '',
    component: ViewProfessorComponent,
    data: { breadcrumb: 'Painel Professor' }
  },
  {
    path: 'turmas/:id',
    component: TurmaDetalheComponent,
    data: { breadcrumb: 'Turma' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewProfessorRoutingModule { }
