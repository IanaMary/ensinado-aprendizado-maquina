import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'view-aluno',
    loadChildren: () => import('../interno/view-aluno/view-aluno.module').then(m => m.ViewAlunoModule),
    data: { breadcrumb: 'Dashboard' }
  },
  {
    path: 'view-professor',
    loadChildren: () => import('../interno/view-professor/view-professor.module').then(m => m.ViewProfessorModule),
    data: { breadcrumb: 'Professor' }
  },
  {
    path: 'view-admin',
    loadChildren: () => import('../interno/view-admin/view-admin.module').then(m => m.ViewAdminModule),
    data: { breadcrumb: 'Administracao' }
  },
  {
    path: 'trilha',
    loadChildren: () => import('../interno/trilha/trilha.module').then(m => m.TrilhaModule),
    data: { breadcrumb: 'Trilha de ML' }
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'view-aluno'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InternoRoutingModule { }
