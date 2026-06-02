import { NgModule } from '@angular/core';
import { ViewProfessorComponent } from './containers/view-professor.component';
import { ViewProfessorRoutingModule } from './view-professor-routing.module';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    ViewProfessorComponent,
  ],
  imports: [
    ViewProfessorRoutingModule,
    SharedModule
  ],
  providers: []
})
export class ViewProfessorModule { }
