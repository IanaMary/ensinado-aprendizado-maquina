import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { ArtefatosComponent } from './artefatos.component';

const routes: Routes = [
  {
    path: '',
    component: ArtefatosComponent,
    data: { breadcrumb: 'Artefatos' },
  },
];

@NgModule({
  declarations: [ArtefatosComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes), SharedModule],
})
export class ArtefatosModule {}
