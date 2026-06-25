import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewAdminComponent } from './containers/view-admin.component';
import { ViewAdminRoutingModule } from './view-admin-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { ConfTutorModule } from '../conf-tutor/conf-tutor.module';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


import { LogsErrosComponent } from './logs-erros/logs-erros.component';
import { LogsBackendComponent } from './logs-backend/logs-backend.component';

@NgModule({
  declarations: [
    ViewAdminComponent,
    LogsErrosComponent,
    LogsBackendComponent,
  ],
  imports: [
    CommonModule,
    ViewAdminRoutingModule,
    SharedModule,
    DashboardModule,
    ConfTutorModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: []
})
export class ViewAdminModule { }
