import { NgModule } from '@angular/core';
import { InternoRoutingModule } from './interno-routing.module';
import { InternoComponent } from './interno.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    InternoComponent,
  ],
  imports: [
    InternoRoutingModule,
    SharedModule
  ],
  exports: [],
  providers: [],
  bootstrap: []
})
export class InternoModule { }
