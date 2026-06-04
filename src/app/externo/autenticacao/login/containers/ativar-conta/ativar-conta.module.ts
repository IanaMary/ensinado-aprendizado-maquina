import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AtivarContaComponent } from './ativar-conta.component';

const routes: Routes = [
  {
    path: '',
    component: AtivarContaComponent
  }
];

@NgModule({
  declarations: [
    AtivarContaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class AtivarContaModule { }
