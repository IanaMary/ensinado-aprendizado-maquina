import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ExecucoesComponent } from './execucoes/execucoes.component';
import { ColetaDeDadosComponent } from './pipeline/coleta-de-dados/coleta-de-dados.component';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { ModalColetaDadoComponent } from './execucoes/modals/modal-coleta-dado/modal-coleta-dado.component';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button'; 


@NgModule({
  declarations: [
    DashboardComponent,
    PipelineComponent,
    ExecucoesComponent,
    ColetaDeDadosComponent,
    ModalColetaDadoComponent
  ],
  imports: [CommonModule,
    DragDropModule,
    MatCardModule,
    MatDialogModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule
  ]
})
export class DashboardModule { }
