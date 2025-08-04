import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ExternoComponent } from './externo.component';

// Containers

const routes: Routes = [
  {
    path: '',
    component: ExternoComponent,
    children: [
      {
        path: 'login',
        loadChildren: () => import('./autenticacao/login/login.module').then(mod => mod.LoginModule)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: '**',
        redirectTo: 'login'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExternoRoutingModule { }
