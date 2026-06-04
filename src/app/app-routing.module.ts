import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './service/router-guard/auth.guard';

const routes: Routes = [
  {
    path: 'ativar-conta',
    loadChildren: () => import('./externo/autenticacao/login/containers/ativar-conta/ativar-conta.module').then(m => m.AtivarContaModule)
  },
  {
    path: 'autenticacao',
    loadChildren: () => import('./externo/externo.module').then(m => m.ExternoModule)
  },
  {
    path: 'manual',
    loadChildren: () => import('./shared/manual/manual.module').then(m => m.ManualModule)
  },
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./interno/interno.module').then(m => m.InternoModule),
    canLoad: [AuthGuard]
  },
  { path: '**', redirectTo: 'autenticacao/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
