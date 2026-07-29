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
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { QuillModule } from 'ngx-quill';

import { ConfTutorRoutingModule } from './conf-tutor-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { ConfTutorComponent } from './containers/conf-tutor.component';


@NgModule({
  declarations: [
    ConfTutorComponent
  ],
  imports: [
    ConfTutorRoutingModule,
    SharedModule,
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
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSelectModule,
    // Editor visual do texto de boas-vindas. `quill` e `ngx-quill` já eram dependências (e o
    // `quill.snow.css` já estava no angular.json) — sobraram da versão antiga desta tela.
    QuillModule,
  ],
  providers: []
})
export class ConfTutorModule { }
