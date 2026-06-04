import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { GerenciarUsuariosComponent } from './gerenciar-usuarios.component';

const routes: Routes = [
  {
    path: '',
    component: GerenciarUsuariosComponent,
    data: { breadcrumb: 'Gerenciar Usuários' }
  }
];

@NgModule({
  declarations: [
    GerenciarUsuariosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class GerenciarUsuariosModule { }
