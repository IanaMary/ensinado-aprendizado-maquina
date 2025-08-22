import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import modulesJson from '../../modules.json';



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
    private dashboardService: DashboardService) {

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
      },
      error: (error: any) => {
        this.erroTutor = true;
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
