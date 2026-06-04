import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-ativar-conta',
  templateUrl: './ativar-conta.component.html',
  styleUrls: ['./ativar-conta.component.scss'],
  standalone: false
})
export class AtivarContaComponent implements OnInit {
  formSenha!: FormGroup;
  token: string = '';
  carregando = true;
  tokenValido = false;
  nomeUsuario = '';
  emailUsuario = '';
  erroToken = '';
  ativandoConta = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.formSenha = this.fb.group({
      senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]]
    }, { validator: this.senhasIguais });

    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.verificarToken();
      } else {
        this.carregando = false;
        this.erroToken = 'Token de convite não encontrado.';
      }
    });
  }

  senhasIguais(group: FormGroup): { [key: string]: boolean } | null {
    const senha = group.get('senha')?.value;
    const confirmar = group.get('confirmarSenha')?.value;
    return senha === confirmar ? null : { senhasNaoIguais: true };
  }

  verificarToken(): void {
    this.http.get<any>(`${environment.apiUrl}usuario/convite/${this.token}`).subscribe({
      next: (response: any) => {
        this.tokenValido = true;
        this.carregando = false;
        this.nomeUsuario = response.nome;
        this.emailUsuario = response.email;
      },
      error: (err: any) => {
        this.carregando = false;
        this.tokenValido = false;
        if (err.status === 404) {
          this.erroToken = 'Convite não encontrado ou já utilizado.';
        } else if (err.status === 400) {
          this.erroToken = 'Convite expirado. Solicite um novo convite.';
        } else {
          this.erroToken = 'Erro ao verificar convite.';
        }
      }
    });
  }

  ativarConta(): void {
    if (this.formSenha.invalid) {
      this.formSenha.markAllAsTouched();
      return;
    }

    this.ativandoConta = true;
    const senha = this.formSenha.get('senha')?.value;

    this.http.post<any>(`${environment.apiUrl}usuario/convite/${this.token}/ativar`, { senha }).subscribe({
      next: (response: any) => {
        this.ativandoConta = false;
        this.snackBar.open('Conta ativada com sucesso! Faça login para continuar.', 'Fechar', {
          duration: 5000,
          panelClass: 'snackbar-success'
        });
        this.router.navigate(['/autenticacao/login']);
      },
      error: (err: any) => {
        this.ativandoConta = false;
        const msg = err.error?.detail || 'Erro ao ativar conta.';
        this.snackBar.open(msg, 'Fechar', { duration: 5000 });
      }
    });
  }

  irParaLogin(): void {
    this.router.navigate(['/autenticacao/login']);
  }

  getErroCampo(campo: string): string {
    const control = this.formSenha.get(campo);
    if (control?.hasError('required')) return 'Campo obrigatório';
    if (control?.hasError('minlength')) return 'Mínimo 6 caracteres';
    return '';
  }
}
