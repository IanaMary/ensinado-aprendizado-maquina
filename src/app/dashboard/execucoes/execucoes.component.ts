import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalExecucaoComponent } from './modals/modal-execucao/modal-execucao.component';
import { TutorContexto } from '../tutor/tutor.component';
import { Subject, takeUntil } from 'rxjs';
import tutor from '../../constants/tutor.json';


@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  private destroy$ = new Subject<void>();
  private modalAberto = false;
  private tutorRef = tutor;

  tutor: any;
  tutorPipelineInfo: any = null;
  tutorItemInfo: any = null;
  tutorTheme: string = 'default';
  tutorThemeClass: string = 'theme-default';
  paramsTutor = '';
  etapaAtual = '';

  itens: ItemPipeline[] = [];
  colunaColeta: ItemPipeline[] = [];
  colunaTreino: ItemPipeline[] = [];
  colunaMetrica: ItemPipeline[] = [];

  resultadoColetaDado?: ResultadoColetaDado;
  modeloSelecionado?: ItemPipeline;
  resultadoTreinamento?: any;
  metricasSelecionadas: ItemPipeline[] = [];
  resultadosDasAvaliacoes: any = {};

  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.getTutor('inicio');
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
      this.colunaColeta = itens.filter(i => i.tipoItem === 'coleta-dado');
      this.colunaTreino = itens.filter(i => i.tipoItem === 'treino-validacao-teste');
      this.colunaMetrica = itens.filter(i => i.tipoItem === 'metrica');
      this.metricasSelecionadas = this.colunaMetrica.filter(i => i.movido);
    });
    this.dashboardService.proximaEtapaPipe$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        this.getTutor(event.etapaAtual, event.chaves);
      });

    // Escuta cliques de info do pipeline sidebar
    this.dashboardService.infoItemClicked$
      .pipe(takeUntil(this.destroy$))
      .subscribe((item: ItemPipeline) => {
        this.mostrarInfoItem(item, new Event('click'));
      });
  }


  abrirModalExecucao(item: ItemPipeline): void {
    if (this.modalAberto) return;
    this.modalAberto = true;

    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa: item.tipoItem === 'metrica' ? 'avaliacao' : item.tipoItem === 'treino-validacao-teste' ? 'treinamento' : item.tipoItem,
        tipoArquivoSelecionado: item.tipoItem === 'coleta-dado' ? item.valor : undefined,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: item.tipoItem === 'treino-validacao-teste' ? item : this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      this.modalAberto = false;
      if (resultado) {
        this.resultadoColetaDado = resultado.resultadoColetaDado
        this.modeloSelecionado = resultado.modeloSelecionado
        this.resultadoTreinamento = resultado.resultadoTreinamento;
        this.metricasSelecionadas = resultado.metricasSelecionadas;
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
        this.dashboardService.moverItensEmExecucao();
        this.atualizarTutorContexto();
      }
    });
  }

  mostrarInfoItem(item: ItemPipeline, event: Event): void {
    event.stopPropagation();

    // Define o tema baseado no tipo de item
    if (item.tipoItem === 'coleta-dado') {
      this.tutorTheme = 'coleta';
      this.tutorThemeClass = 'theme-coleta';
    } else if (item.tipoItem === 'treino-validacao-teste') {
      this.tutorTheme = 'treino';
      this.tutorThemeClass = 'theme-treino';
    } else if (item.tipoItem === 'metrica') {
      this.tutorTheme = 'metrica';
      this.tutorThemeClass = 'theme-metrica';
    }

    // Busca informacoes do item
    this.tutorItemInfo = this.getItemInfo(item);
    this.tutorPipelineInfo = null;
  }

  private getItemInfo(item: ItemPipeline): any {
    const tipo = item.tipoItem;
    const valor = item.valor;

    // Info para itens de coleta
    if (tipo === 'coleta-dado') {
      const coletaInfo: any = {
        'xlxs': {
          titulo: 'Arquivo Excel (.xlsx)',
          descricao: 'O formato XLSX e o padrao do Microsoft Excel. Suporta multiplas abas, formatacao de celulas e formulas. Ideal para dados organizados em tabelas com metadados.',
          dicas: [
            'Verifique se os dados estao na primeira aba ou especifique qual usar',
            'Remova linhas de cabecalho extras antes de importar',
            'Colunas devem ter nomes unicos na primeira linha',
            'Valores numericos nao devem conter caracteres especiais'
          ],
          conceitos: [
            { nome: 'Atributos (Features)', desc: 'Colunas de entrada que o modelo usa para aprender' },
            { nome: 'Target', desc: 'Coluna que o modelo deve prever' },
            { nome: 'Tipos de dados', desc: 'Numerico, texto, booleano - o modelo precisa saber o tipo de cada coluna' }
          ]
        },
        'csv': {
          titulo: 'Arquivo CSV (Comma-Separated Values)',
          descricao: 'CSV e um formato simples onde cada linha e um registro e os valores sao separados por virgula (ou ponto-e-virgula). E leve, universal e rapido de processar.',
          dicas: [
            'Verifique o separador utilizado (virgula, ponto-e-virgula, tab)',
            'Encoding comum: UTF-8. Se acentos aparecerem errados, tente Latin-1',
            'Valores com virgula devem estar entre aspas',
            'Linhas vazias no final podem causar erros'
          ],
          conceitos: [
            { nome: 'Separador', desc: 'Caractere que divide as colunas (, ; \\t)' },
            { nome: 'Encoding', desc: 'Como os caracteres especiais sao representados (UTF-8, Latin-1)' },
            { nome: 'Header', desc: 'Primeira linha com os nomes das colunas' }
          ]
        },
        'json': {
          titulo: 'Arquivo JSON (JavaScript Object Notation)',
          descricao: 'JSON e um formato hierarquico usado em APIs e aplicacoes web. Os dados sao organizados em pares chave-valor, permitindo estruturas complexas e aninhadas.',
          dicas: [
            'O arquivo deve conter um array de objetos na raiz',
            'Chaves devem ser consistentes entre todos os objetos',
            'Valores numericos nao devem ter aspas',
            'Arrays aninhados precisam ser "achados" antes de importar'
          ],
          conceitos: [
            { nome: 'Objeto', desc: 'Conjunto de pares chave-valor entre chaves {}' },
            { nome: 'Array', desc: 'Lista de valores entre colchetes []' },
            { nome: 'Aninhamento', desc: 'Objeto dentro de objeto - pode precisar de transformacao' }
          ]
        }
      };
      return coletaInfo[valor] || coletaInfo['csv'];
    }

    // Info para modelos de treinamento
    if (tipo === 'treino-validacao-teste') {
      const modelos = this.tutorRef.modelos as any;
      const modeloInfo = modelos?.[valor];
      if (modeloInfo) {
        return {
          titulo: modeloInfo.nome,
          descricao: modeloInfo.descricao,
          dicas: modeloInfo.quandoUsar?.slice(0, 4) || [],
          conceitos: [
            { nome: 'Tipo', desc: modeloInfo.tipo || 'Classificador' },
            { nome: 'Hiperparametros', desc: Object.keys(modeloInfo.hiperparametros || {}).length + ' configuraveis' },
            { nome: 'Complexidade', desc: modeloInfo.complexidade || 'Variavel' }
          ],
          hiperparametros: modeloInfo.hiperparametros,
          vantagens: modeloInfo.vantagens,
          desvantagens: modeloInfo.desvantagens
        };
      }
      return {
        titulo: item.label,
        descricao: item.resumo || 'Modelo de machine learning para treinamento.',
        dicas: ['Selecione o modelo e configure os hiperparametros', 'Clique em Treinar para iniciar o processo']
      };
    }

    // Info para metricas
    if (tipo === 'metrica') {
      const metricas = this.tutorRef.metricas as any;
      const metricaInfo = metricas?.[valor];
      if (metricaInfo) {
        return {
          titulo: metricaInfo.nome,
          descricao: metricaInfo.descricao,
          dicas: metricaInfo.quandoUsar?.slice(0, 4) || [],
          conceitos: [
            { nome: 'Formula', desc: metricaInfo.formula },
            { nome: 'Intervalo', desc: metricaInfo.intervalo },
            { nome: 'Interpretacao', desc: metricaInfo.interpretacao }
          ],
          formula: metricaInfo.formula,
          intuicao: metricaInfo.intuicao,
          exemplo: metricaInfo.exemploReal
        };
      }
      return {
        titulo: item.label,
        descricao: item.resumo || 'Metrica de avaliacao do modelo.',
        dicas: ['Selecione as metricas para avaliar o modelo']
      };
    }

    return {
      titulo: item.label,
      descricao: 'Clique para executar esta etapa do pipeline.',
      dicas: []
    };
  }

  getTutor(etapa: string, chaves: string[] = []) {
    const params = this.criarBody(etapa, chaves)
    if (params !== this.paramsTutor) {
      this.paramsTutor = params;
      this.etapaAtual = this.etapaAtual;
      this.dashboardService.getTutor(this.paramsTutor).subscribe({
        next: async (res: any) => {
          if (res.descricao) {
            this.tutor = res.descricao.replace(/&nbsp;/g, ' ');
          }
        },
        error: (error: any) => { }
      });
    }
  }

  criarBody(etapa: string, chaves: string[]) {

    const params = new URLSearchParams();
    params.append('pipe', etapa);

    chaves?.forEach(chave => params.append('textos', chave));

    return params.toString();
  }

  limparSessao() {
    sessionStorage.removeItem('idColeta');
    sessionStorage.removeItem('configurcaoTreinamento');
    this.resultadoColetaDado = undefined;
    this.modeloSelecionado = undefined;
    this.resultadoTreinamento = undefined;
    this.metricasSelecionadas = [];
    this.resultadosDasAvaliacoes = {};
    this.tutorPipelineInfo = null;
    this.tutorItemInfo = null;
    this.tutorTheme = 'default';
    this.tutorThemeClass = 'theme-default';
    this.dashboardService.limparItensExecucao();
  }

  atualizarTutorContexto(): void {
    if (this.modeloSelecionado) {
      const modelos = this.tutorRef.modelos as any;
      const modeloInfo = modelos?.[this.modeloSelecionado.valor];
      if (modeloInfo) {
        this.tutorPipelineInfo = {
          titulo: modeloInfo.nome,
          descricao: modeloInfo.descricao,
          dicas: modeloInfo.quandoUsar?.slice(0, 3) || []
        };
        this.tutorTheme = 'treino';
        this.tutorThemeClass = 'theme-treino';
      }
    } else if (this.metricasSelecionadas.length > 0) {
      const metricas = this.tutorRef.metricas as any;
      const metricaInfo = metricas?.[this.metricasSelecionadas[0].valor];
      if (metricaInfo) {
        this.tutorPipelineInfo = {
          titulo: metricaInfo.nome,
          descricao: metricaInfo.descricao,
          dicas: metricaInfo.quandoUsar?.slice(0, 3) || []
        };
        this.tutorTheme = 'metrica';
        this.tutorThemeClass = 'theme-metrica';
      }
    } else {
      this.tutorPipelineInfo = null;
      this.tutorTheme = 'default';
      this.tutorThemeClass = 'theme-default';
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
