import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

  body: BodyTutor = {
    tamanho_arq: 0
  };

  tabs = [true, false, false, false, false, false, false]

  erroTutor = false;

  formConfTutor: FormGroup;
  formConfTutor2: FormGroup;


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

    this.formConfTutor2 = this.formBuilder.group({
      formConfTutorInicio: this.formBuilder.group({
        explicacao: [null, [Validators.required]]
      }),
      formConfTutorColetaDados: this.formBuilder.group({
        planilha_treino: [null, [Validators.required]],
        planilha_teste: [null, [Validators.required]],
        divisao_entre_treino_teste: [null, [Validators.required]],
        target: [null, [Validators.required]],
        atributos: [null, [Validators.required]]
      }),
      formConfTutorSelecaoModelo: this.formBuilder.group({
        aprendizado_supervisionado: [null, [Validators.required]],
        classficacao: [null, [Validators.required]],
        modelos_classficacao: this.formBuilder.array([]),
        regressao: [null, [Validators.required]],
        modelos_regressao: this.formBuilder.array([]),
        aprendizado_nao_supervisionado: [null, [Validators.required]],
        reducao_dimensionalidade: [null, [Validators.required]],
        agrupamento: [null, [Validators.required]]
      })
    });

  }


  ngOnInit() { }

  tabAtual(e: any) {
    const idx = e.index
    if (!this.tabs[idx]) {
      this.tabs[idx] = true;
    }
  }

  get formConfTutorInicio(): FormGroup {
    return this.formConfTutor2.get('formConfTutorInicio') as FormGroup;
  }

  get formConfTutorColetaDados(): FormGroup {
    return this.formConfTutor2.get('formConfTutorColetaDados') as FormGroup;
  }

  get formConfTutorSelecaoModelo(): FormGroup {
    return this.formConfTutor2.get('formConfTutorSelecaoModelo') as FormGroup;
  }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }



}
