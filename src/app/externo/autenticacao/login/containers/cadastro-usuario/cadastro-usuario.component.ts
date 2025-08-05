import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { LoginService } from '../../services/login.service';
import { AuthService } from '../../../../../service/auth/auth.service';

@Component({
  selector: 'app-cadastro-usuario',
  templateUrl: './cadastro-usuario.component.html',
  styleUrls: ['./cadastro-usuario.component.scss'],
  standalone: false,
})
export class CadastroUsuarioComponent {


  cadastroUsuarioForm: FormGroup;
  hide = true;

  constructor(private readonly loginService: LoginService,
    private readonly formBuilder: FormBuilder,
    private readonly router: Router,
    private readonly auth: AuthService) {

    this.cadastroUsuarioForm = this.formBuilder.group({
      nome_usuario: [null, [
        Validators.required
      ]],
      email: [null, [
        Validators.required,
        Validators.email
      ]],
      senha: [null, [
        Validators.required,
        Validators.minLength(6)
      ]],
      instituicao_ensino: [null, [
        Validators.required
      ]],
      role: ['aluno', [
        Validators.required
      ]],
      verificador: [null, []]
    });

  }

  ngOnInit() { }

  roleAlterado() {

    const role = this.cadastroUsuarioForm.get('role')?.value === 'professor'

    if (role) {
      this.cadastroUsuarioForm.get('nome')?.setValidators([Validators.required]);
      this.cadastroUsuarioForm.get('nome')?.updateValueAndValidity();
    }
    else {
      this.cadastroUsuarioForm.get('nome')?.setValidators([]);
      this.cadastroUsuarioForm.get('nome')?.updateValueAndValidity();
    }

  }

  postCadastroUsuario() {
    this.loginService.cadastrarAluno(this.cadastroUsuarioForm.value).subscribe({
      next: async (user: any) => {
        const validar = await this.auth.salvarUsuarioSessionStorage(user);
        if (validar) {
          this.router.navigate(['']);
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
