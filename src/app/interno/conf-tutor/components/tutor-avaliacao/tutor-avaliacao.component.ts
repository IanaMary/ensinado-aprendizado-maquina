import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import modulesJson from '../../modules.json';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-avaliacao',
  templateUrl: './tutor-avaliacao.component.html',
  styleUrls: ['./tutor-avaliacao.component.scss'],
  standalone: false,
})
export class TutorAvaliacaoComponent implements OnChanges {

  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  erroTutor = false;
  idTutor = '';

  formConfTutorAvaliacao: FormGroup;

  constructor(private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService) {

    this.formConfTutorAvaliacao = this.formBuilder.group({
      texto_pipe: [null, [Validators.required]],
      explicacao: [null, []]
    });

  }


  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }


  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'avaliacao' }).subscribe({
      next: async (res: any) => {
        this.idTutor = res.id;
        this.formConfTutorAvaliacao.patchValue({
          texto_pipe: res?.texto_pipe || '',
          explicacao: res?.explicacao || ''
        });

      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da avaliação!');
      }
    });

  }

  putTutor() {
    const body = {
      contexto: this.formConfTutorAvaliacao.value
    }

    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: async (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }


}
