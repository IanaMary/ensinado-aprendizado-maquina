import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { BodyTutor } from '../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-conf-tutor',
  templateUrl: './conf-tutor.component.html',
  styleUrls: ['./conf-tutor.component.scss'],
  standalone: false,
})
export class ConfTutorComponent implements OnInit {

  role: string = sessionStorage.getItem('role') || '';

  conteudo = '';

  modules = {
    preserveWhiteSpace: true,
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ]
  };

  body: BodyTutor = {
    tamanho_arq: 0
  };

  erroTutor = false;

  formConfTutor: FormGroup;


  constructor(private readonly loginService: LoginService,
    private readonly formBuilder: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private dashboardService: DashboardService) {

    this.formConfTutor = this.formBuilder.group({
      tamanho_arq: [0, [
        Validators.required
      ]],
      prever_categoria: [null, []],
      dados_rotulados: [null, []],
      num_categorias_conhecidas: [null, []],
      prever_quantidade: [null, []],
      apenas_olhando: [null, []],
    });

  }


  ngOnInit() {
    this.getTutor();
  }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }

  bodyTutor() {
    const aux = this.formConfTutor.value;
    this.body = {
      tamanho_arq: 0
    }
    if (aux.prever_categoria) {
      this.body.tamanho_arq = aux.tamanho_arq;
      this.body.prever_categoria = aux.prever_categoria;
      this.body.dados_rotulados = aux.dados_rotulados;
      if (!aux.dados_rotulados) {
        this.body.num_categorias_conhecidas = aux.num_categorias_conhecidas
      }

    } else {
      this.body.tamanho_arq = aux.tamanho_arq;
      this.body.prever_categoria = aux.prever_categoria;
      this.body.prever_quantidade = aux.prever_quantidade;
      if (!aux.prever_quantidade) {
        this.body.apenas_olhando = aux.apenas_olhando
      }
    }

    this.getTutor();
  }

  getTutor() {
    this.dashboardService.getTutor(this.body).subscribe({
      next: async (res: any) => {
        this.erroTutor = res.descricao ? false : true;
        if (res.descricao) {
          this.conteudo = res.descricao;
        }
      },
      error: (error: any) => {
        this.conteudo = '';
        this.erroTutor = true;
      }
    });

  }

  putTutor() {
    const body = {
      "contexto": this.formConfTutor.value,
      "nova_descricao": this.conteudo
    }

    this.dashboardService.putTutor(body).subscribe({
      next: async (res: any) => {
        if (res.descricao) {
          this.conteudo = res.descricao;
        }
      },
      error: (error: any) => { }
    });
  }

}
