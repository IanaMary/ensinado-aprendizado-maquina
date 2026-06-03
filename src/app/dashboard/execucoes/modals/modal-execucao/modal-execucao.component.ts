import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { BodyTutor, ItemPipeline, ResultadoColetaDado } from '../../../../models/item-coleta-dado.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';
import { TutorContexto } from '../../../tutor/tutor.component';
import { MetricaAvaliacaoComponent } from '../metrica-avaliacao/metrica-avaliacao.component';
import tutor from '../../../../constants/tutor.json';

const COLETA_DADO = 'coleta-dado';
const SELECAO_MODELO = 'selecao-modelo';
const TREINAMENTO = 'treinamento';
const SELECAO_METRICAS = 'selecao-metricas';
const AVALIACAO = 'avaliacao'


@Component({
  selector: 'modal-execucao',
  templateUrl: './modal-execucao.component.html',
  styleUrls: ['./modal-execucao.component.scss'],
  standalone: false
})

export class ModalExecucaoComponent implements OnInit {

  @ViewChild(MetricaAvaliacaoComponent) metricaAvaliacao?: MetricaAvaliacaoComponent;

  tutor = tutor;

  bodyTutor: BodyTutor = {
    tamanho_arq: 0,
  }

  etapas: Record<string, { indice: number; proximo: boolean; titulo: string; botaoProximo?: string }> = {
    [COLETA_DADO]: { indice: 0, proximo: true, titulo: 'Importar Planilha' },
    [SELECAO_MODELO]: { indice: 1, proximo: false, titulo: 'Seleção do Modelo', botaoProximo: 'Treinar' },
    [TREINAMENTO]: { indice: 2, proximo: true, titulo: 'Treinamento' },
    [SELECAO_METRICAS]: { indice: 3, proximo: true, titulo: 'Seleção das Métricas' },
    [AVALIACAO]: { indice: 4, proximo: true, titulo: 'Visualizar Avaliações' }
  };

  etapaKeys = Object.keys(this.etapas);
  nEtapas = this.etapaKeys.length;

  ordemEtapas = Object.keys(this.etapas);
  etapaAtual: string = COLETA_DADO;

  resultadoColetaDado?: ResultadoColetaDado | undefined;
  resultadoTreinamento?: any;
  modeloSelecionado?: ItemPipeline;
  modelosDisponiveis: ItemPipeline[] = [];
  tutorModeloTarget: any[] = [];

  tipoArquivoSelecionado: 'xlxs' | 'csv' | 'json' = 'xlxs';

  metricasDisponiveis: ItemPipeline[] = [];
  metricasSelecionadas: ItemPipeline[] = [];
  resultadosDasAvaliacoes: any = {};

  // Contexto do tutor por etapa
  tutorContexto: TutorContexto | null = null;
  tutorPipelineInfo: any = null;

  constructor(
    private dashboardService: DashboardService,
    public dialogRef: MatDialogRef<ModalExecucaoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.atualizarVariaveis(data);
  }

  ngOnInit(): void { }

  proximo(): void {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    if (indiceAtual < this.ordemEtapas.length - 1) {
      this.etapaAtual = this.ordemEtapas[indiceAtual + 1];
    }

    this.validarProximaEtapa();
    this.atualizarTutorContexto();
    this.autoGerarMetricas();

  }

  anterior(): void {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    if (indiceAtual > 0) {
      this.etapaAtual = this.ordemEtapas[indiceAtual - 1];
    }

    this.validarProximaEtapa();
    this.atualizarTutorContexto();
  }

  irParaEtapa(idx: number): void {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    // So permite voltar para etapas anteriores
    if (idx < indiceAtual) {
      this.etapaAtual = this.ordemEtapas[idx];
      this.validarProximaEtapa();
      this.atualizarTutorContexto();
    }
  }

  autoGerarMetricas(): void {
    // Ao chegar na etapa 5 (avaliacao), gera metricas automaticamente
    if (this.etapaAtual === AVALIACAO && this.metricasSelecionadas.length > 0 && this.resultadoTreinamento) {
      if (this.metricaAvaliacao && !Object.keys(this.resultadosDasAvaliacoes).length) {
        setTimeout(() => this.metricaAvaliacao?.postAvaliacao(), 300);
      }
    }
  }

  atualizarTutorContexto(): void {
    const idx = this.etapas[this.etapaAtual].indice;
    const pipeline = this.tutor.pipeline as any;
    this.tutorPipelineInfo = pipeline?.[this.getPipelineKey(idx)] || null;

    // Reset contexto quando muda de etapa
    if (idx !== 1 && idx !== 3) {
      this.tutorContexto = null;
    }
  }

  private getPipelineKey(idx: number): string {
    const keys = ['coleta', 'selecao_modelo', 'treinamento', 'selecao_metricas', 'avaliacao'];
    return keys[idx] || '';
  }

  validarProximaEtapa(): void {
    switch (this.etapaAtual) {
      case COLETA_DADO:
        const att = this.resultadoColetaDado?.atributos ?? {};
        const attSelecionado = Object.values(att).includes(true);
        const erroTreino = this.resultadoColetaDado?.treino.erro;
        const erroTeste = !!this.resultadoColetaDado?.teste?.erro;
        const existeTarget = this.resultadoColetaDado?.dadosRotulados === true
          && !this.resultadoColetaDado?.target;
        this.etapas[this.etapaAtual].proximo = !erroTreino && !erroTeste && !attSelecionado || existeTarget;
        break;
      case SELECAO_MODELO:
        this.funcBodyTutor();
        break;
      case TREINAMENTO:
        this.etapas[this.etapaAtual].proximo = !this.resultadoTreinamento && this.metricasDisponiveis.length === 0;
        this.funcBodyTutor();
        break;
      case SELECAO_METRICAS:
        this.etapas[this.etapaAtual].proximo = this.metricasSelecionadas.length === 0;
        this.funcBodyTutor();
        break;
      case AVALIACAO:
        this.funcBodyTutor();
        break;
      default:
        this.etapas[this.etapaAtual].proximo = false;
    }
  }

  atualizarResultadoColeta(event: ResultadoColetaDado) {

    this.resultadoColetaDado = event;

    const tipoTarget = this.resultadoColetaDado?.tipoTarget;

    this.tutorModeloTarget = tipoTarget === 'string' ? tutor.resumos['modelo-classificacao'] :
      tipoTarget === 'number' ? tutor.resumos['modelo-regressao'] :
        tutor.resumos['modelo-exploratorio'];

    this.validarProximaEtapa();

    this.dashboardService.habilitadarModelos(
      tipoTarget,
      this.etapas[COLETA_DADO].proximo
    );

    const preverCategoria = this.resultadoColetaDado.preverCategoria ?? false;
    const dadosRotulados = this.resultadoColetaDado.dadosRotulados ?? false;
    this.modelosDisponiveis = this.dashboardService.getModelosPorTipo(preverCategoria, dadosRotulados);
    this.modeloSelecionado = this.modelosDisponiveis[0];
    this.funcBodyTutor();
    this.atualizarTutorContexto();
  }


  atualizarModelo(event: ItemPipeline) {
    this.modeloSelecionado = event;

    // Atualizar contexto do tutor com o modelo selecionado
    const modelos = this.tutor.modelos as any;
    const modeloInfo = modelos?.[event.valor];
    if (modeloInfo) {
      this.tutorContexto = {
        titulo: modeloInfo.nome,
        descricao: modeloInfo.descricao,
        itens: modeloInfo.comoFunciona,
        modelo: modeloInfo
      };
    }

    this.funcBodyTutor();
  }

  async atualizarResultadoTreinamento(event: any) {
    this.resultadoTreinamento = event;
    this.dashboardService.selecionarModelo(this.modeloSelecionado);
    this.inicializarMetricasDisponiveis();
  }

  inicializarMetricasDisponiveis() {

    if (this.resultadoTreinamento) {
      const modelosTreinados = Object.keys(this.resultadoTreinamento);
      this.metricasDisponiveis = this.dashboardService.habilitadarMetricas(modelosTreinados);
      this.validarProximaEtapa();
    }

  }

  atualizarMetricasSelecionadas(event: any) {
    this.metricasSelecionadas = event;
    this.validarProximaEtapa();
  }

  funcResultadoAvaliacoes(event: any) {
    this.resultadosDasAvaliacoes = event;
  }

  atualizarVariaveis(data: any) {
    let todosExistem = false
    if (data?.tipoArquivoSelecionado) {
      this.tipoArquivoSelecionado = data.tipoArquivoSelecionado;
    }
    if (data?.etapa) {
      this.etapaAtual = data.etapa;
      if (!this.resultadoColetaDado && data.resultadoColetaDado) {
        todosExistem = true;
        this.atualizarResultadoColeta(data.resultadoColetaDado);
      }
      if (data.modeloSelecionado) {
        todosExistem = true;
        this.atualizarModelo(data.modeloSelecionado);
      }
      if (data.resultadoTreinamento) {
        todosExistem = true;
        this.atualizarResultadoTreinamento(data.resultadoTreinamento);
      }
      if (data.metricasSelecionadas.length) {
        todosExistem = true;
        this.atualizarMetricasSelecionadas(data.metricasSelecionadas);
      }
      if (data.resultadosDasAvaliacoes.length) {
        todosExistem = true;
        this.funcResultadoAvaliacoes(data.resultadosDasAvaliacoes)
      }
      if (!todosExistem) {
        this.funcBodyTutor();
      }
      this.atualizarTutorContexto();
    }
  }

  fechar(): void {
    this.dialogRef.close({
      resultadoColetaDado: this.resultadoColetaDado,
      modeloSelecionado: this.modeloSelecionado,
      resultadoTreinamento: this.resultadoTreinamento,
      metricasSelecionadas: this.metricasSelecionadas,
      resultadosDasAvaliacoes: this.resultadosDasAvaliacoes,
      etapa: this.etapaAtual
    });
  }

  getClasseLinhaPipe(idx: number): string {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    if (idx < indiceAtual) return 'visitada';
    if (idx === indiceAtual) return 'atual';
    return 'desabilitada';
  }

  drawerOpen = false;

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  get explicacaoAtual(): any[] {
    const idx = this.etapas[this.etapaAtual].indice;
    if (idx === 0) return this.tutor.resumos.xlsx;
    if (idx === 1) return this.tutorModeloTarget;
    return [];
  }

  funcBodyTutor() {
    let chaves: string[] = [];
    if (this.etapaAtual === COLETA_DADO) {
      const totalDadosTreino = this.resultadoColetaDado?.treino?.totalDados ?? 0;
      if (totalDadosTreino === 0) {
        chaves = ['texto_pipe', 'planilha_treino'];
      } else {
        const arquivoTeste = this.resultadoColetaDado?.teste?.nomeArquivo ?? '';
        if (arquivoTeste.length === 0) {
          chaves = ['planilha_treino', 'divisao_entre_treino_teste', 'target', 'atributos'];
        } else {
          chaves = ['planilha_treino', 'planilha_teste', 'target', 'atributos'];
        }
      }
    } else if (this.etapaAtual === SELECAO_MODELO) {
      const dadosRotulados = this.resultadoColetaDado?.dadosRotulados;
      const preverCategoria = this.resultadoColetaDado?.preverCategoria;
      const modelo = this.modeloSelecionado?.valor
      if (preverCategoria && dadosRotulados) {
        const caminho = `supervisionado.classificacao.modelos[valor=${modelo}].explicacao`
        chaves = ['texto_pipe', 'supervisionado.explicacao', 'supervisionado.classificacao.explicacao', caminho];
      } else if (!preverCategoria && dadosRotulados) {
        const caminho = `supervisionado.regressao.modelos[valor=${modelo}].explicacao`
        chaves = ['texto_pipe', 'supervisionado.explicacao', 'supervisionado.regressao.explicacao', caminho];
      } else if (preverCategoria && !dadosRotulados) {
        const caminho = `nao_supervisionado.agrupamento.modelos[valor=${modelo}].explicacao`
        chaves = ['texto_pipe', 'nao_supervisionado.explicacao', 'nao_supervisionado.agrupamento.explicacao', caminho];
      } else if (!preverCategoria && !dadosRotulados) {
        const caminho = `nao_supervisionado.reducao_dimensionalidade.modelos[valor=${modelo}].explicacao`
        chaves = ['texto_pipe', 'nao_supervisionado.explicacao', 'nao_supervisionado.reducao_dimensionalidade.explicacao', caminho];
      }
    } else if (this.etapaAtual === TREINAMENTO || this.etapaAtual === AVALIACAO) {
      chaves = ['texto_pipe', 'explicacao'];
    } else if (this.etapaAtual === SELECAO_METRICAS) {
      const caminhos = this.metricasSelecionadas.map(item => `tipos[valor=${item.valor}].explicacao`);
      chaves = ['texto_pipe', 'explicacao'].concat(caminhos);
    }

    this.emitTutor(chaves);
  }

  emitTutor(chaves: string[]) {
    this.dashboardService.emitirProximaEtapaPipe({ etapaAtual: this.etapaAtual, chaves: chaves });
  }

  getMetricaContexto(metrica: ItemPipeline): void {
    const metricas = this.tutor.metricas as any;
    const metricaInfo = metricas?.[metrica.valor];
    if (metricaInfo) {
      this.tutorContexto = {
        titulo: metricaInfo.nome,
        descricao: metricaInfo.descricao,
        itens: metricaInfo.quandoUsar || metricaInfo.comoLer,
        metrica: metricaInfo
      };
    }
  }
}
