import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { QuillModule } from 'ngx-quill';

import { ConfTutorRoutingModule } from './conf-tutor-routing.module';
import { ConfTutorComponent } from './containers/conf-tutor.component';
import { TutorColetaDadosComponent } from './components/tutor-coleta-dados/tutor-coleta-dados.component';
import { TutorInicioComponent } from './components/tutor-inicio/tutor-inicio.component';
import { TutorSelecaoModeloComponent } from './components/tutor-selecao-modelo/tutor-selecao-modelo.component';
import { TutorTreinamentoComponent } from './components/tutor-treinamento/tutor-treinamento.component';
import { TutorAvaliacaoComponent } from './components/tutor-avaliacao/tutor-avaliacao.component';
import { TutorSelecaoMetricasComponent } from './components/tutor-selecao-metricas/tutor-selecao-metricas.component';


@NgModule({
  declarations: [
    ConfTutorComponent,
    TutorInicioComponent,
    TutorColetaDadosComponent,
    TutorSelecaoModeloComponent,
    TutorTreinamentoComponent,
    TutorSelecaoMetricasComponent,
    TutorAvaliacaoComponent
  ],
  imports: [
    ConfTutorRoutingModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatRadioModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule,
    QuillModule.forRoot(),
  ],
  providers: []
})
export class ConfTutorModule { }
