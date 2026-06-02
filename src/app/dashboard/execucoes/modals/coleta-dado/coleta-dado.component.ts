import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PlanilhaService } from '../../../../service/planilha.service';
import { InformacoesDados, ResultadoColetaDado, TipoDado } from '../../../../models/item-coleta-dado.model';
import tutor from '../../../../constants/tutor.json';
import { DashboardService } from '../../../services/dashboard.service';
import { SessionService } from '../../../../service/sessao-store.service';
import { CsvConfigComponent } from '../csv-config/csv-config.component';

@Component({
  selector: 'app-coleta-dado',
  templateUrl: './coleta-dado.component.html',
  styleUrls: ['./coleta-dado.component.scss'],
  standalone: false
})
export class ColetaDadoComponent implements OnChanges, OnInit {

  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;
  @Input() tipoArquivoSelecionado: 'xlxs' | 'csv' | 'json' = 'xlxs';
  
  @Output() resultadoColetaDadoModificado = new EventEmitter<ResultadoColetaDado>();

  tutor = tutor.resumos;

  treino: InformacoesDados = { dados: [], totalDados: 0, nomeArquivo: '' };
  teste: InformacoesDados = { dados: [], totalDados: 0, nomeArquivo: '' };

  att: { [key: string]: boolean } = {};

  tipoPredicao: 'regressao' | 'classificacao' | 'exploratorio' = 'exploratorio';

  resultColetaDadoL: ResultadoColetaDado = {
    target: '',
    preverCategoria: false,
    dadosRotulados: false,
    colunas: [],
    colunasDetalhes: [],
    porcentagemTreino: 70,
    tipoTarget: null,
    atributos: this.att,
    tipos: {},
    treino: this.treino,
    teste: this.teste
  }

  colunasTabela = ['nome', 'tipo', 'atributos'];

  filtros: Record<string, string> = { nome: '', tipo: '', target: '', atributos: '' };
  opcoesNome: string[] = [];
  opcoesTipo: string[] = [];
  opcoesTarget: string[] = [];
  target: string | null = '';

  idColeta: string = '';
  idConfigurcacaoTreinamento: string = '';
  totalDados: number = 0;
  treinoArquivo: any;
  testeArquivo: any;
  todosMarcados: boolean = false;


  constructor(private planilhaService: PlanilhaService,
    private dashboardService: DashboardService,
    private sessionService: SessionService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) { }

  get aceitarArquivos(): string {
    switch (this.tipoArquivoSelecionado) {
      case 'csv': return '.csv';
      case 'json': return '.json';
      case 'xlxs':
      default:
        return '.xlsx,.xls';
    }
  }

  ngOnChanges(changes: SimpleChanges) {

    this.idColeta = this.sessionService.getColetaId();
    this.idConfigurcacaoTreinamento = this.sessionService.getConfigurcaoTreinamento();
    if (this.idConfigurcacaoTreinamento && !this.resultadoColetaDado) {
      this.getColetaInfo();
    }

  }

  ngOnInit() {
    if (this.resultadoColetaDado) {
      this.resultColetaDadoL = this.resultadoColetaDado;
      this.treino = this.resultColetaDadoL.treino;
      this.teste = this.resultColetaDadoL.teste;
    }
  }



  postArquivo(event: Event, tipo: 'treino' | 'teste') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    if (this.tipoArquivoSelecionado === 'csv') {
      this.abrirConfigCSV(file, tipo);
    } else {
      const formData = this.criarBodyFromEvent(event, tipo);
      if (formData) {
        this.enviarArquivo(formData, tipo);
      }
    }
  }

  abrirConfigCSV(file: File, tipo: 'treino' | 'teste') {
    const dialogRef = this.dialog.open(CsvConfigComponent, {
      width: '90vw',
      maxWidth: '950px',
      panelClass: 'csv-config-dialog',
      disableClose: true,
      data: { file, tipo }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      if (resultado?.confirmado) {
        const formData = new FormData();
        formData.append('tipo', tipo);
        formData.append('file', file, file.name);
        formData.append('separador', resultado.separador);
        formData.append('encoding', resultado.encoding);

        if (tipo === 'treino') {
          const porcentagemTeste = (1 - this.resultColetaDadoL.porcentagemTreino / 100).toString();
          formData.append('test_size', porcentagemTeste);
          this.treinoArquivo = file;
        } else {
          this.testeArquivo = file;
          if (this.idColeta) {
            formData.append('id_coleta', this.idColeta);
          }
        }

        this.enviarArquivo(formData, tipo);
      }
    });
  }

  enviarArquivo(formData: FormData, tipo: 'treino' | 'teste') {
    this.dashboardService.postColetaArquivo(this.tipoArquivoSelecionado, formData).subscribe({
      next: (res: any) => {
        this.idColeta = res.id_coleta;
        this.msgErro(tipo, '')
        this.sessionService.setColetaId(this.idColeta)
        if (res.id_configuracoes_treinamento) {
          this.idConfigurcacaoTreinamento = res.id_configuracoes_treinamento;
          this.sessionService.setConfigurcaoTreinamento(this.idConfigurcacaoTreinamento)
        }
        this.preencherDados(res);
      },
      error: (err) => {
        console.error(err.error.detail);
        const msg = err?.error?.detail ? err.error.detail : `Erro ao enviar o arquivo de ${tipo}.`
        this.msgErro(tipo, msg)
      }
    });
  }

  criarBodyFromEvent(event: Event, tipo: 'treino' | 'teste') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const formData = new FormData();
    formData.append('tipo', tipo);

    if (tipo === 'treino') {
      const porcentagemTeste = (1 - this.resultColetaDadoL.porcentagemTreino / 100).toString()
      this.treinoArquivo = input.files[0];
      formData.append('file', this.treinoArquivo, this.treinoArquivo.name);
      formData.append('test_size', porcentagemTeste);
    } else if (tipo === 'teste') {
      this.testeArquivo = input.files[0];
      formData.append('file', this.testeArquivo, this.testeArquivo.name);
      if (this.idColeta) {
        formData.append('id_coleta', this.idColeta);
      }
    }

    return formData;
  }

  msgErro(tipo: 'treino' | 'teste', msg: string) {
    if (tipo === 'treino') {
      this.treino.erro = msg;
    } else {
      this.teste.erro = msg;
    }
  }

  getColetaInfo() {
    this.dashboardService.getColetaInfo('xlxs', this.idConfigurcacaoTreinamento).subscribe({
      next: (res: any) => {
        this.preencherDados(res);
      },
      error: (err) => { }
    });
  }


  preencherDados(res: any) {

    if (!res?.atributos) return;

    const nomeColunas = Object.keys(res.atributos);
    this.totalDados = res.num_linhas_total;

    this.resultColetaDadoL.colunas = nomeColunas;
    this.resultColetaDadoL.atributos = res.atributos;
    this.resultColetaDadoL.target = res.target;
    this.resultColetaDadoL.tipoTarget = res.tipo_target;
    this.resultColetaDadoL.preverCategoria = res.prever_categoria;
    this.resultColetaDadoL.dadosRotulados = res.dados_rotulados || res.daods_rotulados;


    this.resultColetaDadoL.colunasDetalhes = res.colunas_detalhes;

    this.treino.dados = res.preview_treino;
    this.treino.totalDados = res.num_linhas_treino;
    this.treino.nomeArquivo = res.arquivo_nome_treino;
    this.treino.erro = '';

    this.teste.dados = res.preview_teste || [];
    this.teste.totalDados = res.num_linhas_teste || 0;
    this.teste.nomeArquivo = res.arquivo_nome_teste ?? '';
    this.teste.erro = '';

    console.log('DEBUG teste.dados:', JSON.stringify(this.teste.dados));
    console.log('DEBUG colunas:', this.resultColetaDadoL.colunas);

    this.opcoesNome = nomeColunas;
    this.opcoesTarget = nomeColunas;

    this.resultadoColetaDado = this.resultColetaDadoL;
    this.resultadoColetaDadoModificado.emit(this.resultadoColetaDado);

    this.cdr.detectChanges();
  }

  preverCategoriaDadosRotulados(bool: boolean) {
    const dadoss_rotulados = this.resultColetaDadoL.dadosRotulados ?? false;
    this.resultColetaDadoL.target = dadoss_rotulados && bool ? this.resultColetaDadoL.target : '';
    this.putConfiguracaoTreino();
  }

  onTipoPredicaoChange(tipo: 'regressao' | 'classificacao' | 'exploratorio') {
    this.tipoPredicao = tipo;

    if (tipo === 'exploratorio') {
      this.resultColetaDadoL.dadosRotulados = false;
      this.resultColetaDadoL.preverCategoria = false;
      this.resultColetaDadoL.target = '';
    } else if (tipo === 'classificacao') {
      this.resultColetaDadoL.preverCategoria = true;
      this.resultColetaDadoL.dadosRotulados = true;
    } else {
      this.resultColetaDadoL.preverCategoria = false;
      this.resultColetaDadoL.dadosRotulados = true;
    }

    this.resultColetaDadoL.target = '';
    this.putConfiguracaoTreino();
  }

  onDadosRotuladosChange() {
    if (!this.resultColetaDadoL.dadosRotulados) {
      this.resultColetaDadoL.target = '';
    }
    this.putConfiguracaoTreino();
  }

  isColunaHabilitada(item: any): boolean {
    if (this.tipoPredicao === 'exploratorio') return false;
    if (!this.resultColetaDadoL.dadosRotulados) return false;

    const tipo = item.tipo_coluna;
    if (this.tipoPredicao === 'classificacao') return tipo === 'string';
    if (this.tipoPredicao === 'regressao') return tipo === 'number';
    return false;
  }

  getMotivoDesabilitado(item: any): string {
    if (this.tipoPredicao === 'exploratorio') return 'Selecione um tipo de predição';
    if (!this.resultColetaDadoL.dadosRotulados) return 'Marque "Dados possuem rótulo"';

    const tipo = item.tipo_coluna;
    if (this.tipoPredicao === 'classificacao' && tipo === 'number') return 'Classificação requer coluna texto';
    if (this.tipoPredicao === 'regressao' && tipo === 'string') return 'Regressão requer coluna numérica';
    return '';
  }

  putConfiguracaoTreino() {
    const dadoss_rotulados = this.resultColetaDadoL.dadosRotulados ?? false;
    const prever_categoria = this.resultColetaDadoL.preverCategoria ?? false;
    const body = {
      target: this.resultColetaDadoL.target,
      atributos: this.resultColetaDadoL.atributos,
      prever_categoria: prever_categoria,
      dados_rotulados: dadoss_rotulados,
    }

    this.dashboardService.putColetaConfig('xlxs', this.idConfigurcacaoTreinamento, body).subscribe({
      next: (res: any) => {
        this.resultColetaDadoL.tipoTarget = res.tipo_target;
        this.resultadoColetaDado = this.resultColetaDadoL;
        this.resultadoColetaDadoModificado.emit(this.resultadoColetaDado);
      },
      error: (err) => { }
    });
  }



  onFiltroChange(coluna: string, valor: string) {
    //   this.filtros[coluna] = valor.toLowerCase();
    //   if (coluna === 'target') {
    //     this.target = valor === '-' ? null : valor;

    //   } else {
    //     this.dataSourceTreino.filter = JSON.stringify(this.filtros);
    //   }
  }

  selecaoTargetAtt(e: any, bool: boolean) {
    if (bool) {
      const target = e.value
      this.resultColetaDadoL.target = target
      this.resultColetaDadoL.atributos[target] = false;
    }

    this.putConfiguracaoTreino();
  }

  selecionarTodosAtributos() {
    const target = this.resultColetaDadoL.target;
    for (const col of this.resultColetaDadoL.colunas) {
      if (col !== target) {
        this.resultColetaDadoL.atributos[col] = true;
      }
    }
    this.todosMarcados = true;
    this.putConfiguracaoTreino();
  }

  limparTodosAtributos() {
    for (const col of this.resultColetaDadoL.colunas) {
      this.resultColetaDadoL.atributos[col] = false;
    }
    this.todosMarcados = false;
    this.putConfiguracaoTreino();
  }

  toggleTodosAtributos() {
    if (this.todosMarcados) {
      this.limparTodosAtributos();
    } else {
      this.selecionarTodosAtributos();
    }
  }


  configurarFiltro() {
    // this.dataSourceColunas.filterPredicate = (linha, raw) => {
    //   const f = JSON.parse(raw as string);

    //   if (f.nome && !linha.nome.toLowerCase().includes(f.nome)) return false;
    //   if (f.tipo && !linha.tipo.toLowerCase().includes(f.tipo)) return false;

    //   const isTarget = linha.nome === this.target;
    //   if (f.target === 'sim' && !isTarget) return false;
    //   if (f.target === 'não' && isTarget) return false;

    //   const marcado = !!this.treino.atributos[linha.nome];
    //   if (f.atributos === 'marcados' && !marcado) return false;
    //   if (f.atributos === 'desmarcados' && marcado) return false;

    //   return true;
    // };
  }

  obterColunas(dados: any[]): string[] {
    return dados?.length ? Object.keys(dados[0]) : [];
  }

  detectarTipos(dados: any[]): Record<string, TipoDado> {
    const tipos: Record<string, TipoDado> = {};
    if (!dados?.length) return tipos;

    Object.keys(dados[0]).forEach(k => {
      const v = dados[0][k];
      const tipoJS = typeof v;

      if (tipoJS === 'number') tipos[k] = 'Número';
      else if (tipoJS === 'boolean') tipos[k] = 'Booleano';
      else tipos[k] = 'Texto';
    });

    return tipos;
  }


  porcentagemTreino = 70; // valor inicial
  atualizarPocentagemTreino() {
    this.resultColetaDadoL.porcentagemTreino = this.porcentagemTreino;
  }

  get maxTarget(): number {
    return Math.floor(this.resultColetaDadoL.treino.totalDados * 0.9);
  }

  get testeCount(): number {
    const testSize = 1 - (this.resultColetaDadoL.porcentagemTreino / 100);
    return Math.ceil(this.totalDados * testSize);
  }

  get treinoCount(): number {
    return this.resultColetaDadoL.treino.totalDados;
  }

  get testePercent(): number {
    return 100 - this.resultColetaDadoL.porcentagemTreino;
  }

  get dicaPredicao(): string[] {
    switch (this.tipoPredicao) {
      case 'regressao':
        return [
          'Aprendizado supervisionado com saída contínua.',
          'Target numérico: como preço, idade, temperatura, nota.',
          'Objetivo: prever valores contínuos com base nos atributos.'
        ];
      case 'classificacao':
        return [
          'Aprendizado supervisionado: o modelo aprende com exemplos rotulados.',
          'Target do tipo texto (categorias): como sim/não, alto/médio/baixo.',
          'Objetivo: classificar novas entradas em categorias.'
        ];
      case 'exploratorio':
        return [
          'Aprendizado não supervisionado: o modelo busca padrões nos dados.',
          'Sem target definido — o algoritmo encontra estruturas sozinho.',
          'Exemplos: agrupamento (K-means), redução de dimensionalidade (PCA).'
        ];
      default:
        return [];
    }
  }


  incrementar(bool: boolean) {
    if (bool) {
      this.resultColetaDadoL.porcentagemTreino += 5;
    } else {
      this.resultColetaDadoL.porcentagemTreino -= 5;
    }
  }


}
