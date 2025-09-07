import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import modulesJson from '../../modules.json';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-inicio',
  templateUrl: './tutor-inicio.component.html',
  styleUrls: ['./tutor-inicio.component.scss'],
  standalone: false,
})
export class TutorInicioComponent implements OnChanges {

  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  erroTutor = false;
  idTutor = '';

  formConfTutorInicio: FormGroup;

  constructor(private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService) {

    this.formConfTutorInicio = this.formBuilder.group({
      texto_pipe: [null, [Validators.required]],
      explicacao: ['', []]
    });

  }


  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }


  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'inicio' }).subscribe({
      next: async (res: any) => {
        this.idTutor = res.id;
        this.formConfTutorInicio.patchValue({
          texto_pipe: res?.texto_pipe || '',
          explicacao: res?.explicacao || ''
        });

      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados do início!');
      }
    });

  }

  putTutor() {
    const body = {
      contexto: this.formConfTutorInicio.value
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
