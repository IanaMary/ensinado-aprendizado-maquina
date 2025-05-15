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

import { DashboardComponent } from './dashboard.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { ExecucoesComponent } from './execucoes/execucoes.component';
import { ColetaDeDadosComponent } from './pipeline/coleta-de-dados/coleta-de-dados.component';
import { ModalColetaDadoComponent } from './execucoes/modals/modal-coleta-dado/modal-coleta-dado.component';
import { FiltroColunaComponent } from './execucoes/filtro-coluna/filtro-coluna.component';



@NgModule({
  declarations: [
    DashboardComponent,
    PipelineComponent,
    ExecucoesComponent,
    ColetaDeDadosComponent,
    ModalColetaDadoComponent,
    FiltroColunaComponent
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
    MatMenuModule
  ]
})
export class DashboardModule { }
