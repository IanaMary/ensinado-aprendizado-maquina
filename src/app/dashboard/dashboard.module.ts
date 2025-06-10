import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms'; // Importe o FormsModule
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DashboardComponent } from './dashboard.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { ExecucoesComponent } from './execucoes/execucoes.component';
import { ColetaDeDadosComponent } from './pipeline/coleta-de-dados/coleta-de-dados.component';
import { FiltroColunaComponent } from './execucoes/filtro-coluna/filtro-coluna.component';
import { HttpClientModule } from '@angular/common/http';
import { TreinoValidacaoTesteComponent } from './pipeline/treino-validacao-teste/treino-validacao-teste.component';
import { ClasificadorComponent } from './execucoes/modals/classificador/classificador.component';
import { ColetaDadoComponent } from './execucoes/modals/coleta-dado/coleta-dado.component';
import { TiposClassificadoresComponent } from './execucoes/modals/tipos-classificadores/tipos-classificadores.component';
import { ModalExecucaoComponent } from './execucoes/modals/modal-execucao/modal-execucao.component';
import { SelecaoMetricasComponent } from './execucoes/modals/selecao-metricas/selecao-metricas.component';
import { MetricasComponent } from './pipeline/metricas/metricas.component';
import { MetricaAvaliacaoComponent } from './execucoes/modals/metrica-avaliacao/metrica-avaliacao.component';



@NgModule({
  declarations: [
    DashboardComponent,
    PipelineComponent,
    ExecucoesComponent,
    ColetaDeDadosComponent,
    ColetaDadoComponent,
    FiltroColunaComponent,
    TreinoValidacaoTesteComponent,
    ClasificadorComponent,
    ModalExecucaoComponent,
    TiposClassificadoresComponent,
    SelecaoMetricasComponent,
    MetricasComponent,
    MetricaAvaliacaoComponent
  ],
  imports: [CommonModule,
    DragDropModule,
    MatCardModule,
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatRadioModule,
    MatCheckboxModule,
    FormsModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    HttpClientModule
  ]
})
export class DashboardModule { }
