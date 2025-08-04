import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'view-aluno',
    loadChildren: () => import('../interno/view-aluno/view-aluno.module').then(m => m.ViewAlunoModule)
  },
  {
    path: 'view-professor',
    loadChildren: () => import('../interno/view-professor/view-professor.module').then(m => m.ViewProfessorModule)
  },
  {
    path: 'view-admin',
    loadChildren: () => import('../interno/view-admin/view-admin.module').then(m => m.ViewAdminModule)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'view-aluno' // ou outra rota padrão, conforme seu sistema
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InternoRoutingModule { }
