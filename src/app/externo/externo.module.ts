import { NgModule } from '@angular/core';
import { ExternoRoutingModule } from './externo-routing.module';
import { ExternoComponent } from './externo.component';
import { CommonModule } from '@angular/common';

// Containers


@NgModule({
  declarations: [
    ExternoComponent
  ],
  imports: [
    CommonModule,
    ExternoRoutingModule
  ]
})
export class ExternoModule { }
