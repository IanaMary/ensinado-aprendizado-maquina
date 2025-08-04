import { NgModule } from '@angular/core';
import { LoginComponent } from './containers/login/login.component';
import { LoginRoutingModule } from './login-routing.module';
import { SharedModule } from '../../../shared/shared.module';
import { CadastroUsuarioComponent } from './containers/cadastro-usuario/cadastro-usuario.component';


@NgModule({
  declarations: [
    LoginComponent,
    CadastroUsuarioComponent
  ],
  imports: [
    LoginRoutingModule,
    SharedModule
  ]
})
export class LoginModule { }
