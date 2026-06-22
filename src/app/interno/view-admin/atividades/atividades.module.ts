import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AtividadesComponent } from './atividades.component';

const routes: Routes = [
  {
    path: '',
    component: AtividadesComponent,
    data: { breadcrumb: 'Atividades' },
  },
];

@NgModule({
  declarations: [AtividadesComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    MatIconModule,
  ],
})
export class AtividadesModule {}
