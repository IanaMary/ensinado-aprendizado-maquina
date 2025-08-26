import { Component, Input, OnChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import modulesJson from '../../modules.json';
import { DashboardService } from '../../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-tutor-tipos-aprendizado',
  templateUrl: './tutor-tipos-aprendizado.component.html',
  styleUrls: ['./tutor-tipos-aprendizado.component.scss'],
  standalone: false,
})
export class TtutorTiposAprendizadoComponent implements OnChanges {

  @Input() atualizar = false;

  role: string = sessionStorage.getItem('role') || '';
  modules = modulesJson.modules;

  idTutor = '';
  erroTutor = false;

  tipoAprendizado = 0;
  subTipoAprendizado = 0;

  formConfTutorSelecaoModelo: FormGroup;

  constructor(
    private readonly formBuilder: FormBuilder,
    private dashboardService: DashboardService,
    private readonly notificacao: NotificacaoService
  ) {
    this.formConfTutorSelecaoModelo = this.formBuilder.group({
      texto_pipe: [''],
      tipos: this.formBuilder.group({
        supervisionado: this.formBuilder.group({
          explicacao: [''],
          classficacao: this.formBuilder.group({ explicacao: [''] }),
          regressao: this.formBuilder.group({ explicacao: [''] })
        }),
        nao_supervisionado: this.formBuilder.group({
          explicacao: [''],
          reducao_dimensionalidade: this.formBuilder.group({ explicacao: [''] }),
          agrupamento: this.formBuilder.group({ explicacao: [''] })
        })
      })
    });
  }

  ngOnChanges() {
    if (this.atualizar) {
      this.getTutor();
    }
  }

  getTutor() {
    this.dashboardService.getTutorEditar({ pipe: 'selecao-modelo' }).subscribe({
      next: (res: any) => {
        this.idTutor = res.id;

        // Atualiza o texto principal
        this.formConfTutorSelecaoModelo.patchValue({
          texto_pipe: res?.texto_pipe || ''
        });

        // Atualiza supervisionado e nao_supervisionado
        ['supervisionado', 'nao_supervisionado'].forEach(grupo => {
          const grupoData = res?.tipos?.[grupo];
          if (!grupoData) return;

          const grupoForm = this.formConfTutorSelecaoModelo.get(`tipos.${grupo}`) as FormGroup;
          if (grupoData.explicacao !== undefined) {
            grupoForm.patchValue({ explicacao: grupoData.explicacao });
          }

          // Atualiza subgrupos
          Object.keys(grupoData).forEach(sub => {
            if (sub === 'explicacao') return;

            const subData = grupoData[sub];
            const subForm = grupoForm.get(sub) as FormGroup;
            if (!subForm) return;

            if (subData.explicacao !== undefined) {
              subForm.patchValue({ explicacao: subData.explicacao });
            }
          });
        });

        this.erroTutor = false;
      },
      error: (error: any) => {
        this.erroTutor = true;
        this.notificacao.erro('Erro ao buscar dados da seleção do modelo!');
      }
    });
  }

  putTutor() {
    const body = {
      contexto: this.formConfTutorSelecaoModelo.value
    }
    this.dashboardService.putTutor(body, this.idTutor).subscribe({
      next: (res: any) => {
        this.notificacao.sucesso('Edição feita com sucesso!');
      },
      error: (error: any) => {
        this.notificacao.erro('Erro ao editar!');
      }
    });
  }


  removerNbspEditor(event: any, caminho: string) {
    const control = this.formConfTutorSelecaoModelo.get(caminho);
    if (!control) return;

    // substitui &nbsp; por espaço normal
    const valorLimpo = (event.html || '').replace(/&nbsp;/g, ' ').trim();

    // só atualiza se o valor realmente mudou
    if (valorLimpo !== control.value) {
      control.setValue(valorLimpo, { emitEvent: false }); // evita disparar outro onContentChanged
    }
  }

}
