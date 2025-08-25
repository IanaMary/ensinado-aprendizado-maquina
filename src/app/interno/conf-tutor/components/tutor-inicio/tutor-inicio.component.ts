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
      explicacao: [null, [Validators.required]]
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
    const body = this.bodyTutor();
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: async (res: any) => {
        this.idTutor = res.id;
        this.formConfTutorInicio.patchValue({
          explicacao: res?.explicacao || ''
        });
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }


  bodyTutor() {
    const contextoOriginal = this.formConfTutorInicio.value;
    const contextoTratado = Object.fromEntries(
      Object.entries(contextoOriginal).map(([key, value]) => {
        return [key, typeof value === 'string' ? value.replace(/&nbsp;/g, ' ') : value];
      })
    );
    return {
      contexto: contextoTratado
    };
  }

}
