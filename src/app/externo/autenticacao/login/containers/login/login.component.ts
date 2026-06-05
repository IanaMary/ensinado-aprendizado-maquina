import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { AuthService } from '../../../../../service/auth/auth.service';
import { NotificacaoService } from '../../../../../service/notificacao.service';
import { roleMap } from '../../../../../models/item-coleta-dado.model';


@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {


  loginForm: FormGroup;
  hide = true;

  constructor(private readonly loginService: LoginService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly notificacao: NotificacaoService) {

    this.loginForm = this.formBuilder.group({
      email: [null, [
        Validators.required,
        Validators.email
      ]],
      senha: [null, [
        Validators.required,
        Validators.minLength(6)
      ]]
    });

  }

  ngOnInit() { }

  cadastroUsuario() {
    this.router.navigate(['cadastro-usuario'], { relativeTo: this.route });
  }

  entrar() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, senha } = this.loginForm.value;
    console.log('Tentando login com:', { email, senha });

    this.loginService.login(email, senha).subscribe({
      next: (usuario: any) => {
        console.log('Login response:', usuario);
        this.auth.salvarUsuarioSessionStorage(usuario).then(() => {
          const role = usuario?.usuario?.role;
          console.log('Role:', role, 'Rota:', roleMap[role]);
          const rota = roleMap[role] || '/autenticacao/login';
          this.router.navigate([rota]);
        });
      },
      error: (error: any) => {
        console.error('Erro no login:', error);
        let messageErr: string;

        switch (error.status) {
          case 401:
            messageErr = 'Usuário e/ou senha incorretos.';
            break;
          case 429:
            messageErr = 'Muitas tentativas. Aguarde 1 minuto.';
            break;
          case 0:
            messageErr = 'Sem conexão com o servidor.';
            break;
          default:
            messageErr = 'Algo de errado aconteceu, tente novamente mais tarde.';
        }

        this.notificacao.erro(messageErr);
      }
    });
  }

}
