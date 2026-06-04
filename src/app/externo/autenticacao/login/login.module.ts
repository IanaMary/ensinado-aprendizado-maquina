import { NgModule } from '@angular/core';
import { LoginComponent } from './containers/login/login.component';
import { LoginRoutingModule } from './login-routing.module';
import { SharedModule } from '../../../shared/shared.module';
import { CadastroUsuarioComponent } from './containers/cadastro-usuario/cadastro-usuario.component';
import { AtivarContaComponent } from './containers/ativar-conta/ativar-conta.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@NgModule({
  declarations: [
    LoginComponent,
    CadastroUsuarioComponent,
    AtivarContaComponent
  ],
  imports: [
    LoginRoutingModule,
    SharedModule,
    MatProgressSpinnerModule
  ]
})
export class LoginModule { }
