import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanilhaService } from '../../../../service/planilha.service';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-modal-coleta-dado',
  templateUrl: './modal-coleta-dado.component.html',
  styleUrls: ['./modal-coleta-dado.component.scss'],
  standalone: false
})
export class ModalColetaDadoComponent implements OnInit {

  dados: any[] = [];
  colunas: string[] = [];
  dataSourceColunas = new MatTableDataSource<{ nome: string, tipo: string }>([]);

  dadosTeste: any[] = [];
  colunasTeste: string[] = [];
  dataSourceColunasTeste = new MatTableDataSource<{ nome: string, tipo: string }>([]);

  erro?: string;
  erroTeste?: string;


  nomeArquivoTreino?: string;
  nomeArquivoTeste?: string;

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

  constructor(
    public dialogRef: MatDialogRef<ModalColetaDadoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private planilhaService: PlanilhaService
  ) {
    if (data) {
      if (data.dados?.length) this.dados = data.dados;
      this.colunas = data.colunas?.length ? data.colunas : this.obterColunas(this.dados);
      this.tipos = data.tipos ? data.tipos : this.detectarTipos(this.dados);
      this.target = data.target ?? '';
      this.atributos = data.atributos ?? {};
  
      // Aqui adiciona o erroTeste e nomes dos arquivos se vierem
      this.erroTeste = data.erroTeste ?? undefined;
      this.nomeArquivoTreino = data.nomeArquivoTreino ?? undefined;
      this.nomeArquivoTeste = data.nomeArquivoTeste ?? undefined;
    }
  }

  ngOnInit() {
    this.atualizarDataSource();
    this.configurarFiltro();
    if (this.dadosTeste.length) this.atualizarDataSourceTeste();
  }

  obterColunas(dados: any[]): string[] {
    if (!dados || dados.length === 0) return [];
    return Object.keys(dados[0]);
  }

  detectarTipos(dados: any[]): { [key: string]: string } {
    const tipos: { [key: string]: string } = {};
    if (!dados || dados.length === 0) return tipos;
    const item = dados[0];
    for (const key of Object.keys(item)) {
      const valor = item[key];
      if (typeof valor === 'number') tipos[key] = 'Número';
      else if (typeof valor === 'boolean') tipos[key] = 'Booleano';
      else tipos[key] = 'Texto';
    }
    return tipos;
  }

  atualizarDataSource() {
    const colunasParaExibir = this.obterColunas(this.dados).map(nome => ({
      nome,
      tipo: this.tipos[nome] || 'Desconhecido'
    }));
    this.dataSourceColunas.data = colunasParaExibir;
    this.colunas = this.obterColunas(this.dados);

    this.opcoesNome = Array.from(new Set(colunasParaExibir.map(c => c.nome))).sort();
    this.opcoesTipo = Array.from(new Set(colunasParaExibir.map(c => c.tipo))).sort();
  }

  atualizarDataSourceTeste() {
    const colunasParaExibir = this.obterColunas(this.dadosTeste).map(nome => ({
      nome,
      tipo: this.tipos[nome] || 'Desconhecido'
    }));
    this.dataSourceColunasTeste.data = colunasParaExibir;
    this.colunasTeste = this.obterColunas(this.dadosTeste);
  }

  configurarFiltro() {
    this.dataSourceColunas.filterPredicate = (linha, filtro: string) => {
      const filtros = JSON.parse(filtro);
      if (filtros.nome && !linha.nome.toLowerCase().includes(filtros.nome)) return false;
      if (filtros.tipo && !linha.tipo.toLowerCase().includes(filtros.tipo)) return false;

      if (filtros.target) {
        const isTarget = linha.nome === this.target;
        if (filtros.target === 'Sim' && !isTarget) return false;
        if (filtros.target === 'Não' && isTarget) return false;
      }

      if (filtros.atributos) {
        const marcado = !!this.atributos[linha.nome];
        if (filtros.atributos === 'Marcados' && !marcado) return false;
        if (filtros.atributos === 'Desmarcados' && marcado) return false;
      }
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
      dados: this.dados,
      colunas: this.colunas,
      tipos: this.tipos,
      target: this.target,
      atributos: this.atributos,
      dadosTeste: this.dadosTeste,
      colunasTeste: this.colunasTeste,
      erroTeste: this.erroTeste,
      nomeArquivoTreino: this.nomeArquivoTreino,
      nomeArquivoTeste: this.nomeArquivoTeste
    });
  }
  
  onArquivoTreinoSelecionado(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      this.erro = 'Nenhum arquivo selecionado';
      this.nomeArquivoTreino = '';
      return;
    }
  
    const arquivo = input.files[0];
    this.nomeArquivoTreino = arquivo.name;
    this.erro = '';
   
    this.planilhaService.lerPlanilha(arquivo).then(dados => {
      this.erro = undefined;
      this.dados = dados;
      this.colunas = this.obterColunas(dados);
      this.tipos = this.detectarTipos(dados);
      this.atualizarDataSource();
    }).catch(() => {
      this.erro = 'Erro ao ler a planilha de treino.';
    });
  }

  onArquivoTesteSelecionado(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      this.erroTeste = 'Nenhum arquivo selecionado';
      this.nomeArquivoTeste = '';
      return;
    }
  
    const arquivo = input.files[0];
    this.nomeArquivoTeste = arquivo.name;
    this.erroTeste = '';
    
    this.planilhaService.lerPlanilha(arquivo).then(dados => {
      this.erroTeste = undefined;

      const colunasTeste = this.obterColunas(dados);
      const colunasTreinoSet = new Set(this.colunas);
      const colunasTesteSet = new Set(colunasTeste);

      const colunasFaltando = this.colunas.filter(c => !colunasTesteSet.has(c));
      const colunasExtras = colunasTeste.filter(c => !colunasTreinoSet.has(c));

      if (colunasFaltando.length > 0 || colunasExtras.length > 0) {
        this.erroTeste = `Colunas diferentes entre treino e teste. ` +
                         (colunasFaltando.length ? `Faltando: ${colunasFaltando.join(', ')}. ` : '') +
                         (colunasExtras.length ? `Extras: ${colunasExtras.join(', ')}.` : '');
        return;
      }

      const tiposTeste = this.detectarTipos(dados);
      const tiposDiferentes = this.colunas.filter(col => {
        const tipoTreino = this.tipos[col] || 'Desconhecido';
        const tipoTeste = tiposTeste[col] || 'Desconhecido';
        return tipoTreino.toLowerCase() !== tipoTeste.toLowerCase();
      });

      if (tiposDiferentes.length > 0) {
        this.erroTeste = `Tipos diferentes entre treino e teste nas colunas: ` +
                         tiposDiferentes.map(col => 
                           `${col} (Treino: ${this.tipos[col]}, Teste: ${tiposTeste[col]})`).join('; ');
        return;
      }

      this.dadosTeste = dados;
      this.colunasTeste = colunasTeste;
      this.atualizarDataSourceTeste();
    }).catch(() => {
      this.erroTeste = 'Erro ao ler a planilha de teste.';
    });
  }
}
