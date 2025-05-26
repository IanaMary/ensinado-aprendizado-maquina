import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanilhaService } from '../../../../service/planilha.service';
import { MatTableDataSource } from '@angular/material/table';
import { InformacoesDados } from '../../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-modal-coleta-dado',
  templateUrl: './modal-coleta-dado.component.html',
  styleUrls: ['./modal-coleta-dado.component.scss'],
  standalone: false
})
export class ModalColetaDadoComponent implements OnInit {

  informacoesDados: InformacoesDados = {
    treino: {
      nomeArquivo: '',
      erro: '',
      dados: [],
      colunas: []
    },
    teste: {
      nomeArquivo: '',
      erro: '',
      dados: [],
      colunas: []
    }
  };



  tipos: { [key: string]: string } = {};
  atributos: { [key: string]: boolean } = {};
  target: string = '';

  filtros: { [coluna: string]: string } = {
    nome: '',
    tipo: '',
    target: '',
    atributos: ''
  };

  opcoesNome: string[] = [];
  opcoesTipo: string[] = [];

  dataSourceColunas = new MatTableDataSource<{ nome: string, tipo: string }>([]);
  dataSourceColunasTeste = new MatTableDataSource<{ nome: string, tipo: string }>([]);

  constructor(
    public dialogRef: MatDialogRef<ModalColetaDadoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private planilhaService: PlanilhaService
  ) {
    if (data) {
      this.informacoesDados.treino.dados = data.dados ?? [];
      this.informacoesDados.treino.colunas = data.colunas ?? this.obterColunas(data.dados);
      this.tipos = data.tipos ?? this.detectarTipos(data.dados);
      this.target = data.target ?? '';
      this.atributos = data.atributos ?? {};

      this.informacoesDados.teste.erro = data.erroTeste ?? '';
      this.informacoesDados.treino.nomeArquivo = data.nomeArquivoTreino ?? '';
      this.informacoesDados.teste.nomeArquivo = data.nomeArquivoTeste ?? '';
    }
  }

  ngOnInit() {
    this.atualizarDataSourcePorTipo('treino');
    this.configurarFiltro();
    if (this.informacoesDados.teste.dados.length) {
      this.atualizarDataSourcePorTipo('teste');
    }
  }

  obterColunas(dados: any[]): string[] {
    if (!dados?.length) return [];
    return Object.keys(dados[0]);
  }

  detectarTipos(dados: any[]): { [key: string]: string } {
    const tipos: { [key: string]: string } = {};
    if (!dados?.length) return tipos;
    const item = dados[0];
    for (const key of Object.keys(item)) {
      const valor = item[key];
      tipos[key] = typeof valor === 'number' ? 'Número' :
        typeof valor === 'boolean' ? 'Booleano' : 'Texto';
    }
    return tipos;
  }

  atualizarDataSourcePorTipo(tipo: 'treino' | 'teste'): void {
    const colunas = this.obterColunas(this.informacoesDados[tipo].dados);
    this.informacoesDados[tipo].colunas = colunas;

    const colunasParaExibir = colunas.map(nome => ({
      nome,
      tipo: this.tipos[nome] || 'Desconhecido'
    }));

    if (tipo === 'treino') {
      this.dataSourceColunas.data = colunasParaExibir;
      this.opcoesNome = [...new Set(colunasParaExibir.map(c => c.nome))].sort();
      this.opcoesTipo = [...new Set(colunasParaExibir.map(c => c.tipo))].sort();
    } else if (tipo === 'teste') {
      this.dataSourceColunasTeste.data = colunasParaExibir;
    }
  }

  configurarFiltro() {
    this.dataSourceColunas.filterPredicate = (linha, filtro: string) => {
      const filtros = JSON.parse(filtro);
      if (filtros.nome && !linha.nome.toLowerCase().includes(filtros.nome)) return false;
      if (filtros.tipo && !linha.tipo.toLowerCase().includes(filtros.tipo)) return false;

      const isTarget = linha.nome === this.target;
      if (filtros.target === 'Sim' && !isTarget) return false;
      if (filtros.target === 'Não' && isTarget) return false;

      const marcado = !!this.atributos[linha.nome];
      if (filtros.atributos === 'Marcados' && !marcado) return false;
      if (filtros.atributos === 'Desmarcados' && marcado) return false;

      return true;
    };
  }

  onFiltroChange(coluna: string, valor: string) {
    this.filtros[coluna] = valor.toLowerCase();
    this.dataSourceColunas.filter = JSON.stringify(this.filtros);
  }

  selecaoTarget(nomeColuna: string) {
    this.target = nomeColuna;
    for (const key of Object.keys(this.atributos)) {
      if (key === nomeColuna) this.atributos[key] = false;
    }
    this.dataSourceColunas.filter = JSON.stringify(this.filtros);
  }

  fecharModal() {
    this.dialogRef.close({
      dados: this.informacoesDados.treino.dados,
      colunas: this.informacoesDados.treino.colunas,
      tipos: this.tipos,
      target: this.target,
      atributos: this.atributos,
      dadosTeste: this.informacoesDados.teste.dados,
      colunasTeste: this.informacoesDados.teste.colunas,
      erroTeste: this.informacoesDados.teste.erro,
      nomeArquivoTreino: this.informacoesDados.treino.nomeArquivo,
      nomeArquivoTeste: this.informacoesDados.teste.nomeArquivo
    });
  }

  onArquivoSelecionado(event: Event, tipo: 'treino' | 'teste') {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      this.informacoesDados[tipo].erro = 'Nenhum arquivo selecionado';
      this.informacoesDados[tipo].nomeArquivo = '';
      return;
    }

    const arquivo = input.files[0];
    this.informacoesDados[tipo].nomeArquivo = arquivo.name;
    this.informacoesDados[tipo].erro = '';

    this.planilhaService.lerPlanilha(arquivo).then(dados => {
      const colunas = this.obterColunas(dados);

      if (tipo === 'teste') {
        const colunasTreinoSet = new Set(this.informacoesDados.treino.colunas);
        const colunasTesteSet = new Set(colunas);
        const faltando = this.informacoesDados.treino.colunas.filter(c => !colunasTesteSet.has(c));
        const extras = colunas.filter(c => !colunasTreinoSet.has(c));

        if (faltando.length || extras.length) {
          this.informacoesDados.teste.erro =
            `Colunas diferentes entre treino e teste. ` +
            (faltando.length ? `Faltando: ${faltando.join(', ')}. ` : '') +
            (extras.length ? `Extras: ${extras.join(', ')}.` : '');
          return;
        }

        const tiposTeste = this.detectarTipos(dados);
        const tiposDiferentes = colunas.filter(col => {
          const tipoTreino = this.tipos[col]?.toLowerCase();
          const tipoTeste = tiposTeste[col]?.toLowerCase();
          return tipoTreino !== tipoTeste;
        });

        if (tiposDiferentes.length) {
          this.informacoesDados.teste.erro = `Tipos diferentes entre treino e teste nas colunas: ` +
            tiposDiferentes.map(col => `${col} (Treino: ${this.tipos[col]}, Teste: ${tiposTeste[col]})`).join('; ');
          return;
        }

        this.informacoesDados.teste.dados = dados;
        this.atualizarDataSourcePorTipo(tipo);

      } else {
        this.informacoesDados.treino.dados = dados;
        this.informacoesDados.treino.colunas = colunas;
        this.tipos = this.detectarTipos(dados);
        this.atualizarDataSourcePorTipo(tipo);
      }

    }).catch(() => {
      this.informacoesDados[tipo].erro = `Erro ao ler a planilha de ${tipo}.`;
    });
  }
}
