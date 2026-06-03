import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-toy-datasets-dialog',
  templateUrl: './toy-datasets-dialog.component.html',
  styleUrls: ['./toy-datasets-dialog.component.scss'],
  standalone: false
})
export class ToyDatasetsDialogComponent implements OnInit {
  datasets: any[] = [];
  filtroTipo: string = '';
  carregando = false;
  datasetSelecionado: string = '';

  constructor(
    private dialogRef: MatDialogRef<ToyDatasetsDialogComponent>,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {
    this.carregarDatasets();
  }

  carregarDatasets() {
    this.carregando = true;
    this.dashboardService.getToyDatasets().subscribe({
      next: (data: any[]) => {
        this.datasets = data;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  get datasetsFiltrados(): any[] {
    if (!this.filtroTipo) return this.datasets;
    return this.datasets.filter(d => d.tipo === this.filtroTipo);
  }

  selecionarDataset(ds: any) {
    this.datasetSelecionado = ds.valor;
    this.carregando = true;
    
    this.dashboardService.carregarToyDataset(ds.valor).subscribe({
      next: (resultado: any) => {
        this.dialogRef.close(resultado);
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  fechar() {
    this.dialogRef.close();
  }
}
