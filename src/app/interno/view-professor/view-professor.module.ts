import { NgModule } from '@angular/core';
import { ViewProfessorComponent } from './containers/view-professor.component';
import { ViewProfessorRoutingModule } from './view-professor-routing.module';


@NgModule({
  declarations: [
    ViewProfessorComponent,
  ],
  imports: [
    ViewProfessorRoutingModule,
  ],
  providers: []
})
export class ViewProfessorModule { }
