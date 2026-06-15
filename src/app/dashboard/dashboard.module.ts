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
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from "@angular/material/form-field";
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';


import { DashboardComponent } from './dashboard.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { ExecucoesComponent } from './execucoes/execucoes.component';
import { ColetaDeDadosComponent } from './pipeline/coleta-de-dados/coleta-de-dados.component';
import { ToyDatasetsDialogComponent } from './pipeline/coleta-de-dados/toy-datasets-dialog/toy-datasets-dialog.component';
import { PreProcessamentoComponent } from './pipeline/pre-processamento/pre-processamento.component';
import { PreProcessamentoDialogComponent } from './pipeline/pre-processamento/pre-processamento-dialog/pre-processamento-dialog.component';
import { PreProcessamentoConfigComponent } from './execucoes/modals/pre-processamento-config/pre-processamento-config.component';
import { FiltroColunaComponent } from './execucoes/filtro-coluna/filtro-coluna.component';
import { TreinoValidacaoTesteComponent } from './pipeline/treino-validacao-teste/treino-validacao-teste.component';
import { ClasificadorComponent } from './execucoes/modals/classificador/classificador.component';
import { ColetaDadoComponent } from './execucoes/modals/coleta-dado/coleta-dado.component';
import { TiposClassificadoresComponent } from './execucoes/modals/tipos-classificadores/tipos-classificadores.component';
import { ModalExecucaoComponent } from './execucoes/modals/modal-execucao/modal-execucao.component';
import { SelecaoMetricasComponent } from './execucoes/modals/selecao-metricas/selecao-metricas.component';
import { MetricasComponent } from './pipeline/metricas/metricas.component';
import { MetricaAvaliacaoComponent } from './execucoes/modals/metrica-avaliacao/metrica-avaliacao.component';
import { TutorComponent } from './tutor/tutor.component';
import { CsvConfigComponent } from './execucoes/modals/csv-config/csv-config.component';
import { NomearPipelineDialogComponent } from './execucoes/modals/nomear-pipeline-dialog/nomear-pipeline-dialog.component';
import { VisualizacaoDadosComponent } from './execucoes/modals/visualizacao-dados/visualizacao-dados.component';
import { ChatTutorComponent } from './chat-tutor/chat-tutor.component';
import { MarkdownPipe } from './chat-tutor/markdown.pipe';
import { SessionService } from '../service/sessao-store.service';




@NgModule({
  declarations: [
    DashboardComponent,
    PipelineComponent,
    ExecucoesComponent,
    ColetaDeDadosComponent,
    ToyDatasetsDialogComponent,
    PreProcessamentoComponent,
    PreProcessamentoDialogComponent,
    PreProcessamentoConfigComponent,
    ColetaDadoComponent,
    FiltroColunaComponent,
    TreinoValidacaoTesteComponent,
    ClasificadorComponent,
    ModalExecucaoComponent,
    TiposClassificadoresComponent,
    SelecaoMetricasComponent,
    MetricasComponent,
    MetricaAvaliacaoComponent,
    TutorComponent,
    ChatTutorComponent,
    MarkdownPipe,
    CsvConfigComponent,
    NomearPipelineDialogComponent,
    VisualizacaoDadosComponent
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
    MatProgressSpinnerModule,
    MatSliderModule,
    MatInputModule,
    MatFormFieldModule,
    NgxMaskDirective
  ],
  exports: [DashboardComponent],
  providers: [
    provideNgxMask()
  ]
})
export class DashboardModule { }
