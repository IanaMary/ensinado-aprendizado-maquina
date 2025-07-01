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
import { MatTableDataSource } from '@angular/material/table';
import { InformacoesDados, labelParaTipoTargetMap, ResultadoColetaDado, TipoDado } from '../../../../models/item-coleta-dado.model';
import tutor from '../../../../constants/tutor.json';

@Component({
  selector: 'app-coleta-dado',
  templateUrl: './coleta-dado.component.html',
  styleUrls: ['./coleta-dado.component.scss'],
  standalone: false
})
export class ColetaDadoComponent implements OnChanges, OnInit {
  tutor = tutor.resumos;


  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;
  @Output() resultadoColetaDadoModificado = new EventEmitter<ResultadoColetaDado>();


  treino: InformacoesDados = { dados: [], colunas: [], tipos: {}, atributos: {}, target: '', tipoTarget: null };
  teste: InformacoesDados = { dados: [], colunas: [], tipos: {}, atributos: {}, target: '', tipoTarget: null };

  colunasTabela = ['nome', 'tipo', 'atributos'];

  filtros: Record<string, string> = { nome: '', tipo: '', target: '', atributos: '' };
  opcoesNome: string[] = [];
  opcoesTipo: string[] = [];
  opcoesTarget: string[] = [];
  target: string | null = '';


  dataSourceColunas = new MatTableDataSource<{ nome: string; tipo: string }>([]);
  dataSourceColunasTeste = new MatTableDataSource<{ nome: string; tipo: string }>([]);


  constructor(private planilhaService: PlanilhaService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['resultadoColetaDado'] && this.resultadoColetaDado) {
      this.treino = this.resultadoColetaDado.treino || this.treino;
      this.teste = this.resultadoColetaDado.teste || this.teste;

      if (!this.treino.tipos || Object.keys(this.treino.tipos).length === 0) {
        this.treino.tipos = this.detectarTipos(this.treino.dados);
      }
      if (!this.teste.tipos || Object.keys(this.treino.tipos).length === 0) {
        this.teste.tipos = this.detectarTipos(this.teste.dados);
      }

      if (!this.target && this.treino.target) {
        this.target = this.treino.target;
      }

      this.atualizarDataSource('treino');
      this.configurarFiltro();

      if (this.teste.dados.length > 0) {
        this.atualizarDataSource('teste');
      }
    }

    if (changes['target']) {
      this.configurarFiltro();
    }
  }

  ngOnInit() {
    this.atualizarDataSource('treino');
    this.configurarFiltro();
    if (this.teste.dados.length) {
      this.atualizarDataSource('teste');
    }
  }

  onArquivoSelecionado(event: Event, tipo: 'treino' | 'teste') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      (tipo === 'treino' ? this.treino : this.teste).erro = 'Nenhum arquivo selecionado';
      (tipo === 'treino' ? this.treino : this.teste).nomeArquivo = '';
      return;
    }

    const arquivo = input.files[0];
    if (tipo === 'treino') {
      this.treino.nomeArquivo = arquivo.name;
      this.treino.erro = '';
    } else {
      this.teste.nomeArquivo = arquivo.name;
      this.teste.erro = '';
    }

    this.planilhaService.lerPlanilha(arquivo).then(dados => {
      const cols = this.obterColunas(dados);

      if (tipo === 'treino') {
        this.treino.dados = dados;
        this.treino.tipos = this.detectarTipos(dados);
        this.treino.colunas = cols;
        this.treino.atributos = {};
        this.target = '';
      } else {
        const falt = this.treino.colunas.filter(c => !cols.includes(c));
        const extr = cols.filter(c => !this.treino.colunas.includes(c));
        if (falt.length || extr.length) {
          this.teste.erro = `Colunas diferentes. Faltando: ${falt.join(', ')}. Extras: ${extr.join(', ')}.`;
          return;
        }

        const tiposTeste = this.detectarTipos(dados);
        const diff = cols.filter(c =>
          (this.treino.tipos[c] || '').toLowerCase() !== (tiposTeste[c] || '').toLowerCase()
        );
        if (diff.length) {
          this.teste.erro = `Tipos divergentes em: ${diff.map(c =>
            `${c} (Treino: ${this.treino.tipos[c]}, Teste: ${tiposTeste[c]})`
          ).join('; ')}`;
          return;
        }

        this.teste.dados = dados;
        this.teste.colunas = cols;
        this.teste.tipos = tiposTeste;
      }

      this.emitirResultadoColetaDado();

      this.atualizarDataSource(tipo);
    }).catch(() => {
      if (tipo === 'treino') {
        this.treino.erro = `Erro ao ler a planilha de treino.`;
      } else {
        this.teste.erro = `Erro ao ler a planilha de teste.`;
      }
    });
  }

  onFiltroChange(coluna: string, valor: string) {
    this.filtros[coluna] = valor.toLowerCase();
    if (coluna === 'target') {
      this.target = valor === '-' ? null : valor;

    } else {
      this.dataSourceColunas.filter = JSON.stringify(this.filtros);
    }
  }

  selecaoTarget() {
    const label = this.treino.target
    const tipoLabel = this.treino.tipos[label]
    this.treino.tipoTarget = labelParaTipoTargetMap[tipoLabel as TipoDado] ?? null
    this.treino.atributos[label] = false;
    this.emitirResultadoColetaDado();
  }

  montarResultadoColetado(): any {
    return {
      treino: this.treino.dados,
      teste: this.teste
    };
  }

  emitirResultadoColetaDado() {
    this.resultadoColetaDadoModificado.emit({
      treino: this.treino,
      teste: this.teste
    });
  }

  getResultadoColeta() {
    return this.montarResultadoColetado();
  }

  atualizarDataSource(tipo: 'treino' | 'teste') {
    const dados = tipo === 'treino' ? this.treino.dados : this.teste.dados;
    const tipos = tipo === 'treino' ? this.treino.tipos : this.teste.tipos;
    const cols = this.obterColunas(dados);
    if (tipo === 'treino') {
      this.treino.colunas = cols;
    } else {
      this.teste.colunas = cols;
    }

    const rows = cols.map(n => ({ nome: n, tipo: tipos[n] || 'Desconhecido' }));

    if (tipo === 'treino') {
      this.dataSourceColunas.data = rows;
      this.opcoesNome = [...new Set(rows.map(r => r.nome))].sort();
      this.opcoesTipo = [...new Set(rows.map(r => r.tipo))].sort();

      this.opcoesTarget = ['-'].concat(this.opcoesNome);
    } else {
      this.dataSourceColunasTeste.data = rows;
    }


  }

  configurarFiltro() {
    this.dataSourceColunas.filterPredicate = (linha, raw) => {
      const f = JSON.parse(raw as string);

      if (f.nome && !linha.nome.toLowerCase().includes(f.nome)) return false;
      if (f.tipo && !linha.tipo.toLowerCase().includes(f.tipo)) return false;

      const isTarget = linha.nome === this.target;
      if (f.target === 'sim' && !isTarget) return false;
      if (f.target === 'não' && isTarget) return false;

      const marcado = !!this.treino.atributos[linha.nome];
      if (f.atributos === 'marcados' && !marcado) return false;
      if (f.atributos === 'desmarcados' && marcado) return false;

      return true;
    };
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
}
