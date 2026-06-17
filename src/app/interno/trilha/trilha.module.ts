import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { TrilhaRoutingModule } from './trilha-routing.module';
import { TrilhaComponent } from './containers/trilha.component';
// Reusa os componentes/serviços do dashboard atual (ex.: ModalExecucaoComponent para
// a carga de dados) sem duplicar lógica de upload/configuração.
import { DashboardModule } from '../../dashboard/dashboard.module';

@NgModule({
  declarations: [TrilhaComponent],
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    DashboardModule,
    TrilhaRoutingModule,
  ],
})
export class TrilhaModule {}
