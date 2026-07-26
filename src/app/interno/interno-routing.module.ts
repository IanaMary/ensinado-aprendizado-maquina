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
    // Rota compartilhada admin/professor (a API autoriza ambos os papéis).
    path: 'atividades',
    loadChildren: () => import('../interno/view-admin/atividades/atividades.module').then(m => m.AtividadesModule),
    data: { breadcrumb: 'Atividades' }
  },
  {
    // Desafio de montagem (quebra-cabeça avaliado). Aberto pela lista de atividades da
    // turma, com ?turma=&atividade= — o aluno não chega aqui digitando a URL.
    path: 'desafio',
    loadComponent: () => import('../interno/desafio/desafio.component').then(m => m.DesafioComponent),
    data: { breadcrumb: 'Desafio' }
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
