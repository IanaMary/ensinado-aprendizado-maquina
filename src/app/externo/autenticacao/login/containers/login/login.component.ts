import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { AuthService } from '../../../../../service/auth/auth.service';
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
  email: any;
  senha: any;

  constructor(private readonly loginService: LoginService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService) {

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

    this.loginService.login(this.email, this.senha).subscribe({
      next: async (usuario: any) => {
        const validar = await this.auth.salvarUsuarioSessionStorage(usuario);
        if (validar) {

          const role = usuario?.usuario?.role
          const rota = roleMap[role] || '/autenticacao/login';
          await this.router.navigate([rota]);
        }
      },
      error: (error: any) => {
        let messageErr: string;

        switch (error.status) {
          case 401:
            messageErr = 'Usuário e/ou senha incorretos.';
            break;
          default:
            messageErr = 'Algo de errado aconteceu, tente novamente mais tarde.';
        }

        console.error('Erro de login:', messageErr);
      }
    });
  }

}
