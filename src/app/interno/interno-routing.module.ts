import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'projetos',
    loadChildren: () => import('../interno/projetos/meus-projetos.module').then(m => m.MeusProjetosModule),
    data: { breadcrumb: 'Meus Projetos' }
  },
  {
    path: 'galeria',
    loadChildren: () => import('../interno/galeria/galeria-pipelines.module').then(m => m.GaleriaPipelinesModule),
    data: { breadcrumb: 'Galeria' }
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
    path: 'trilha',
    loadChildren: () => import('../interno/trilha/trilha.module').then(m => m.TrilhaModule),
    data: { breadcrumb: 'Trilha de ML' }
  },
  {
    path: 'inicio',
    loadComponent: () => import('../interno/inicio/inicio.component').then(m => m.InicioComponent),
    data: { breadcrumb: 'Início' }
  },
  {
    path: 'treine-robo',
    loadComponent: () => import('../interno/treine-robo/treine-robo.component').then(m => m.TreineRoboComponent),
    data: { breadcrumb: 'Treine seu Robô' }
  },
  {
    path: 'leo-mundo-real',
    loadComponent: () => import('../interno/leo-mundo-real/leo-mundo-real.component').then(m => m.LeoMundoRealComponent),
    data: { breadcrumb: 'Léo no Mundo Real' }
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InternoRoutingModule { }
