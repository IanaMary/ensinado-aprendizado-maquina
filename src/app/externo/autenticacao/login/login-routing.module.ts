import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Containers
import { LoginComponent } from './containers/login/login.component';
import { CadastroUsuarioComponent } from './containers/cadastro-usuario/cadastro-usuario.component';
import { AtivarContaComponent } from './containers/ativar-conta/ativar-conta.component';

const routes: Routes = [
  {
    path: 'ativar-conta',
    component: AtivarContaComponent
  },
  {
    path: 'cadastro-usuario',
    component: CadastroUsuarioComponent
  },
  {
    path: '',
    component: LoginComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginRoutingModule { }
