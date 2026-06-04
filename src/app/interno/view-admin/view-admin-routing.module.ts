import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewAdminComponent } from './containers/view-admin.component';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { ConfPipelineComponent } from '../conf-pipeline/containers/conf-pipeline.component';
import { ConfTutorComponent } from '../conf-tutor/containers/conf-tutor.component';

const routes: Routes = [
  {
    path: '',
    component: ViewAdminComponent,
    data: { breadcrumb: 'Painel Admin' }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { breadcrumb: 'Pipeline' }
  },
  {
    path: 'conf-pipeline',
    component: ConfPipelineComponent,
    data: { breadcrumb: 'Config Pipeline' }
  },
  {
    path: 'conf-tutor',
    component: ConfTutorComponent,
    data: { breadcrumb: 'Config Tutor' }
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./gerenciar-usuarios/gerenciar-usuarios.module').then(m => m.GerenciarUsuariosModule),
    data: { breadcrumb: 'Gerenciar Usuários' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewAdminRoutingModule { }
