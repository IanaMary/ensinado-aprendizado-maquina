import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './service/router-guard/auth.guard.ts';

const routes: Routes = [
  {
    path: 'autenticacao',
    loadChildren: () => import('./externo/externo.module').then(m => m.ExternoModule)
  },
  {
    path: '',
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
