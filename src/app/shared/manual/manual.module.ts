import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ManualComponent } from './manual.component';

const routes: Routes = [
  {
    path: '',
    component: ManualComponent
  }
];

@NgModule({
  declarations: [
    ManualComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatIconModule
  ]
})
export class ManualModule { }
