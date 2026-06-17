import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrilhaComponent } from './containers/trilha.component';

const routes: Routes = [
  { path: '', component: TrilhaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrilhaRoutingModule {}
