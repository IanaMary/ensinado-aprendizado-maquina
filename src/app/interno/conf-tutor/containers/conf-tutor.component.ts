import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { BodyTutor } from '../../../models/item-coleta-dado.model';

// Mapeia o indice da aba para o slug "pipe" usado no backend/audit log.
const TAB_PIPES = [
  'inicio',
  'coleta-dado',
  'selecao-modelo',      // tipos-aprendizado edita selecao-modelo
  'selecao-modelo',      // selecao-modelo
  'treinamento',
  'selecao-metricas',
  'avaliacao',
];

const OPERACOES_LABEL: Record<string, string> = {
  atualizar_descricao: 'Atualização de texto',
  atualizar_modelos: 'Atualização de modelos',
  atualizar_chaves_fixas: 'Atualização de chaves',
};

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

  tabs = [true, false, false, false, false, false, false];

  erroTutor = false;

  formConfTutor: FormGroup;
  formConfTutor2: FormGroup;

  // Historico de edicoes
  historico: any[] = [];
  historicoAberto = true;
  carregandoHistorico = false;
  pipeAtual: string = TAB_PIPES[0];

  constructor(private readonly loginService: LoginService,
    private readonly formBuilder: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private dashboardService: DashboardService) {

    this.formConfTutor = this.formBuilder.group({
      tamanho_arq: [0, [Validators.required]],
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
        classificacao: [null, [Validators.required]],
        modelos_classificacao: this.formBuilder.array([]),
        regressao: [null, [Validators.required]],
        modelos_regressao: this.formBuilder.array([]),
        aprendizado_nao_supervisionado: [null, [Validators.required]],
        reducao_dimensionalidade: [null, [Validators.required]],
        agrupamento: [null, [Validators.required]]
      })
    });
  }


  ngOnInit() {
    this.carregarHistorico(this.pipeAtual);
  }

  tabAtual(e: any) {
    const idx = e.index;
    if (!this.tabs[idx]) {
      this.tabs[idx] = true;
    }
    this.pipeAtual = TAB_PIPES[idx] || TAB_PIPES[0];
    this.carregarHistorico(this.pipeAtual);
  }

  recarregarHistorico() {
    this.carregarHistorico(this.pipeAtual);
  }

  private carregarHistorico(pipe: string) {
    this.carregandoHistorico = true;
    this.dashboardService.getTutorAudit(pipe, 20).subscribe({
      next: (entradas: any[]) => {
        this.historico = entradas || [];
        this.carregandoHistorico = false;
      },
      error: () => {
        this.historico = [];
        this.carregandoHistorico = false;
      }
    });
  }

  formatarTimestamp(ts: string | null): string {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return ts;
    }
  }

  formatarOperacao(op: string): string {
    return OPERACOES_LABEL[op] || op;
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
