import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewAlunoComponent } from './containers/view-aluno.component';

const routes: Routes = [
  {
    path: 'projetos',
    loadChildren: () => import('./meus-projetos/meus-projetos.module').then(m => m.MeusProjetosModule),
    data: { breadcrumb: 'Meus Projetos' }
  },
  {
    path: 'galeria',
    loadChildren: () => import('./galeria-pipelines/galeria-pipelines.module').then(m => m.GaleriaPipelinesModule),
    data: { breadcrumb: 'Galeria de Pipelines' }
  },
  {
    path: '',
    component: ViewAlunoComponent,
    data: { breadcrumb: 'Pipeline' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewAlunoRoutingModule { }
