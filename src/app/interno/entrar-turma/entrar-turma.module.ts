import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { EntrarTurmaComponent } from './entrar-turma.component';

const routes: Routes = [
  { path: '', component: EntrarTurmaComponent, data: { breadcrumb: 'Minhas turmas' } },
];

@NgModule({
  declarations: [EntrarTurmaComponent],
  imports: [RouterModule.forChild(routes), SharedModule],
})
export class EntrarTurmaModule {}
