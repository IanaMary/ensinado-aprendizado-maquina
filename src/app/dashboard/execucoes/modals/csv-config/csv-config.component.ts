import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-csv-config',
  templateUrl: './csv-config.component.html',
  styleUrls: ['./csv-config.component.scss'],
  standalone: false
})
export class CsvConfigComponent implements OnInit {

  separadores = [
    { valor: 'virgula', label: 'Vírgula ( , )', exemplo: 'col1,col2,col3' },
    { valor: 'ponto_virgula', label: 'Ponto e vírgula ( ; )', exemplo: 'col1;col2;col3' },
    { valor: 'tab', label: 'Tabulação (Tab)', exemplo: 'col1\tcol2\tcol3' },
    { valor: 'pipe', label: 'Pipe ( | )', exemplo: 'col1|col2|col3' },
  ];

  encodings = [
    { valor: 'utf-8', label: 'UTF-8' },
    { valor: 'latin-1', label: 'Latin-1 (ISO-8859-1)' },
    { valor: 'cp1252', label: 'Windows-1252' },
  ];

  separador: string = 'virgula';
  encoding: string = 'utf-8';
  linhasPreview: number = 50;

  carregando: boolean = false;
  erro: string = '';

  preview: any[] = [];
  colunas: string[] = [];
  colunasDetalhes: any[] = [];

  pagina: number = 0;
  linhasPorPagina: number = 10;

  constructor(
    public dialogRef: MatDialogRef<CsvConfigComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { file: File, tipo: string },
    private dashboardService: DashboardService
  ) { }

  ngOnInit(): void {
    this.fazerPreview();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.preview.length / this.linhasPorPagina));
  }

  get paginaAtual(): any[] {
    const inicio = this.pagina * this.linhasPorPagina;
    return this.preview.slice(inicio, inicio + this.linhasPorPagina);
  }

  paginaAnterior() {
    if (this.pagina > 0) this.pagina--;
  }

  proximaPagina() {
    if (this.pagina < this.totalPaginas - 1) this.pagina++;
  }

  fazerPreview() {
    if (!this.data?.file) return;

    this.carregando = true;
    this.erro = '';
    this.pagina = 0;

    const formData = new FormData();
    formData.append('file', this.data.file, this.data.file.name);
    formData.append('separador', this.separador);
    formData.append('encoding', this.encoding);
    formData.append('linhas', this.linhasPreview.toString());

    this.dashboardService.previewCSV(formData).subscribe({
      next: (res: any) => {
        this.colunas = res.colunas || [];
        this.colunasDetalhes = res.colunas_detalhes || [];
        this.preview = res.preview || [];
        this.carregando = false;
      },
      error: (err) => {
        this.erro = err?.error?.detail || 'Erro ao ler arquivo CSV';
        this.carregando = false;
        this.preview = [];
        this.colunas = [];
      }
    });
  }

  onSeparadorChange() {
    this.fazerPreview();
  }

  onEncodingChange() {
    this.fazerPreview();
  }

  confirmar() {
    this.dialogRef.close({
      separador: this.separador,
      encoding: this.encoding,
      confirmado: true
    });
  }

  cancelar() {
    this.dialogRef.close({ confirmado: false });
  }

  getTipoColuna(col: string): string {
    const detalhe = this.colunasDetalhes.find((d: any) => d.nome_coluna === col);
    return detalhe?.tipo_coluna || '';
  }
}
