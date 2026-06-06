import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MeusProjetosComponent } from './meus-projetos.component';

const routes: Routes = [
  {
    path: '',
    component: MeusProjetosComponent,
    data: { breadcrumb: 'Meus Projetos' }
  }
];

@NgModule({
  declarations: [
    MeusProjetosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ]
})
export class MeusProjetosModule { }
