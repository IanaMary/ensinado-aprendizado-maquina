import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ConfPipelineComponent } from './conf-pipeline.component';


@NgModule({
  declarations: [
    ConfPipelineComponent,
  ],
  imports: [CommonModule,
    HttpClientModule,
  ],
  providers: []
})
export class ConfPipelineModule { }
