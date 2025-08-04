import { NgModule } from '@angular/core';
import { InternoRoutingModule } from './interno-routing.module';
import { InternoComponent } from './interno.component';



@NgModule({
  declarations: [
    InternoComponent
  ],
  imports: [
    InternoRoutingModule
  ],
  providers: [],
  bootstrap: []
})
export class InternoModule { }