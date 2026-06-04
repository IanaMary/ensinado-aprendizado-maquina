import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GaleriaPipelinesComponent } from './galeria-pipelines.component';

const routes: Routes = [
  {
    path: '',
    component: GaleriaPipelinesComponent,
    data: { breadcrumb: 'Galeria de Pipelines' }
  }
];

@NgModule({
  declarations: [
    GaleriaPipelinesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class GaleriaPipelinesModule { }
