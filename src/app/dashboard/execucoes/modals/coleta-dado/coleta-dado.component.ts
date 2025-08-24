import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnInit
} from '@angular/core';
import { PlanilhaService } from '../../../../service/planilha.service';
import { InformacoesDados, ResultadoColetaDado, TipoDado } from '../../../../models/item-coleta-dado.model';
import tutor from '../../../../constants/tutor.json';
import { DashboardService } from '../../../services/dashboard.service';
import { SessionService } from '../../../../service/sessao-store.service';

@Component({
  selector: 'app-coleta-dado',
  templateUrl: './coleta-dado.component.html',
  styleUrls: ['./coleta-dado.component.scss'],
  standalone: false
})
export class ColetaDadoComponent implements OnChanges, OnInit {

  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;
  @Output() resultadoColetaDadoModificado = new EventEmitter<ResultadoColetaDado>();

  tutor = tutor.resumos;

  treino: InformacoesDados = { dados: [], totalDados: 0, nomeArquivo: '' };
  teste: InformacoesDados = { dados: [], totalDados: 0, nomeArquivo: '' };

  att: { [key: string]: boolean } = {};


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


  constructor(private planilhaService: PlanilhaService,
    private dashboardService: DashboardService,
    private sessionService: SessionService

  ) { }

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

    const formData = this.criarBody(event, tipo)

    this.dashboardService.postColetaArquivo('xlxs', formData).subscribe({
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

  criarBody(event: Event, tipo: 'treino' | 'teste') {
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

      if (this.treinoArquivo) {
        formData.append('file_treino', this.treinoArquivo, this.treinoArquivo.name);
      }

      formData.append('file_teste', this.testeArquivo, this.testeArquivo.name);
      formData.append('id_coleta', this.idColeta);
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

    const nomeColunas = Object.keys(res.atributos);
    this.totalDados = res.num_linhas_total;

    this.resultColetaDadoL.colunas = nomeColunas;
    this.resultColetaDadoL.atributos = res.atributos;
    this.resultColetaDadoL.target = res.target;
    this.resultColetaDadoL.tipoTarget = res.tipo_target;
    this.resultColetaDadoL.preverCategoria = res.prever_categoria;
    this.resultColetaDadoL.dadosRotulados = res.daods_rotulados;


    this.resultColetaDadoL.colunasDetalhes = res.colunas_detalhes;

    this.treino.dados = res.preview_treino;
    this.treino.totalDados = res.num_linhas_treino;
    this.treino.nomeArquivo = res.arquivo_nome_treino;

    this.teste.dados = res.preview_teste;
    this.teste.totalDados = res.num_linhas_teste;
    this.teste.nomeArquivo = res.arquivo_nome_teste ?? '';

    this.opcoesNome = nomeColunas;
    this.opcoesTarget = nomeColunas;

    this.resultadoColetaDado = this.resultColetaDadoL;
    this.resultadoColetaDadoModificado.emit(this.resultadoColetaDado);

  }

  putConfiguracaoTreino() {

    const daods_rotulados = this.resultColetaDadoL.dadosRotulados ?? false;
    const prever_categoria = this.resultColetaDadoL.preverCategoria ?? false;
    this.resultColetaDadoL.target = daods_rotulados ? this.resultColetaDadoL.target : '';
    const body = {
      target: this.resultColetaDadoL.target,
      atributos: this.resultColetaDadoL.atributos,
      prever_categoria: prever_categoria,
      daods_rotulados: daods_rotulados,
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


  incrementar(bool: boolean) {
    if (bool) {
      this.resultColetaDadoL.porcentagemTreino += 5;
    } else {
      this.resultColetaDadoL.porcentagemTreino -= 5;
    }
  }


}
