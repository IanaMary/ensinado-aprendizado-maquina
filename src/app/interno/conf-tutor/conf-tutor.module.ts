import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { ConfTutorComponent } from './containers/conf-tutor.component';
import { ConfTutorRoutingModule } from './conf-tutor-routing.module';
import { MatExpansionModule } from '@angular/material/expansion';
import { QuillModule } from 'ngx-quill';
import { MatDivider } from "@angular/material/divider";

@NgModule({
  declarations: [
    ConfTutorComponent
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
    QuillModule.forRoot(),
    MatDivider
  ],
  exports: [],
  providers: []
})
export class ConfTutorModule { }