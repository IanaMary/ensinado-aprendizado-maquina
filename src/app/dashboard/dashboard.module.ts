import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { PipelineComponent } from './pipeline/pipeline.component';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ExecucoesComponent } from './execucoes/execucoes.component';
import { ColetaDeDadosComponent } from './pipeline/coleta-de-dados/coleta-de-dados.component';
import {MatCardModule} from '@angular/material/card';
@NgModule({
  declarations: [
    DashboardComponent,
    PipelineComponent,
    ExecucoesComponent,
    ColetaDeDadosComponent
  ],
  imports: [ CommonModule,
    DragDropModule,
    MatCardModule
  ]
})
export class DashboardModule { }
