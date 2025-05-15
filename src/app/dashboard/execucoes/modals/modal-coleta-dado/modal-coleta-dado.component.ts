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

  tipos: { [key: string]: string } = {};
  atributos: { [key: string]: boolean } = {};
  target: string = '';
  erro?: string;

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
    }
  }

  ngOnInit() {
    this.atualizarDataSource();

    // Definindo o filtro customizado para o dataSourceColunas
    this.dataSourceColunas.filterPredicate = (linha, filtro: string) => {
      // Aqui o filtro é um JSON stringificado dos filtros aplicados
      const filtros = JSON.parse(filtro);

      // Filtro nome e tipo com includes (string)
      if (filtros.nome && !linha.nome.toLowerCase().includes(filtros.nome)) {
        return false;
      }
      if (filtros.tipo && !linha.tipo.toLowerCase().includes(filtros.tipo)) {
        return false;
      }

      // Filtro target (sim = é target, nao = não é target)
      if (filtros.target) {
        const isTarget = linha.nome === this.target;
        if (filtros.target === 'sim' && !isTarget) return false;
        if (filtros.target === 'nao' && isTarget) return false;
      }

      // Filtro atributos (marcado, desmarcado)
      if (filtros.atributos) {
        const marcado = !!this.atributos[linha.nome];
        if (filtros.atributos === 'marcado' && !marcado) return false;
        if (filtros.atributos === 'desmarcado' && marcado) return false;
      }

      return true;
    };

    this.popularOpcoesFiltro();
    this.aplicarFiltro();
  }

  atualizarDataSource() {
    const linhas = this.colunas.map(nome => ({
      nome,
      tipo: this.tipos[nome],
    }));
    this.dataSourceColunas.data = linhas;
    this.aplicarFiltro(); // reaplica filtro ao atualizar
  }

  popularOpcoesFiltro() {
    this.opcoesNome = Array.from(new Set(this.dataSourceColunas.data.map(d => d.nome))).sort();
    this.opcoesTipo = Array.from(new Set(this.dataSourceColunas.data.map(d => d.tipo))).sort();
  }

  onFiltroSelectChange(coluna: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filtros[coluna] = select.value.trim().toLowerCase();
    this.aplicarFiltro();
  }

  aplicarFiltro() {
    this.dataSourceColunas.filter = JSON.stringify(this.filtros);
  }

  onArquivoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    this.dados = [];
    this.colunas = [];
    this.erro = undefined;

    if (!arquivo) {
      this.erro = 'Nenhum arquivo selecionado.';
      return;
    }

    const extensao = arquivo.name.split('.').pop()?.toLowerCase();
    if (extensao !== 'xlsx') {
      this.erro = 'Formato inválido. Apenas arquivos .xlsx são aceitos.';
      return;
    }

    this.planilhaService.lerPlanilha(arquivo, true).then((dados) => {
      if (dados.length === 0) {
        this.erro = 'A planilha está vazia ou malformada.';
      } else {
        this.dados = dados;
        this.colunas = this.obterColunas(dados);
        this.tipos = this.detectarTipos(dados);

        this.atualizarDataSource();
        this.popularOpcoesFiltro();
      }
    }).catch((e) => {
      this.erro = 'Erro ao processar o arquivo. Verifique se é uma planilha válida.';
      console.error(e);
    });
  }

  obterColunas(dados: any[]): string[] {
    return dados.length > 0 ? Object.keys(dados[0]) : [];
  }

  detectarTipos(dados: any[]): { [key: string]: string } {
    const tipos: { [key: string]: string } = {};
    if (dados.length > 0) {
      this.colunas.forEach(coluna => {
        const tiposColuna = dados.map(item => typeof item[coluna]);
        tipos[coluna] = tiposColuna.length ? tiposColuna[0] : 'unknown';
      });
    }
    return tipos;
  }

  fecharModal(): void {
    const resultado = {
      dados: this.dados,
      colunas: this.colunas,
      tipos: this.tipos,
      target: this.target,
      atributos: this.atributos
    };
    this.dialogRef.close(resultado);
  }

  selecaoTarget(nomeColuna: string) {
    if (this.target && this.atributos.hasOwnProperty(this.target)) {
      this.atributos[this.target] = false;
    }
    this.target = nomeColuna;
    // Opcional: desabilitar atributo da coluna target
    this.atributos[this.target] = false;
    this.aplicarFiltro();
  }

  onFiltroChange(coluna: string, valor: string) {
    this.filtros[coluna] = valor.trim().toLowerCase();
    this.aplicarFiltro();
  }
}
