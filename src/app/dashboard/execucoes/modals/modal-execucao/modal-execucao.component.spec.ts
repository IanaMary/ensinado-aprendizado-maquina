import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModalExecucaoComponent } from './modal-execucao.component';
import { DashboardService } from '../../../services/dashboard.service';

describe('ModalExecucaoComponent', () => {
  let component: ModalExecucaoComponent;
  let fixture: ComponentFixture<ModalExecucaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ModalExecucaoComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    })
    .overrideComponent(ModalExecucaoComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ModalExecucaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should sync preprocessing items when preprocessing config changes', () => {
    const dashboardService = TestBed.inject(DashboardService);
    const spy = spyOn(dashboardService, 'sincronizarPreProcessamentosSelecionados');
    const itens = [{ valor: 'standard_scaler', label: 'StandardScaler', colunas: ['mass'] }];

    component.atualizarPreProcessamento({ itens });

    expect(component.preProcessamentoConfig).toEqual({ itens });
    expect(spy).toHaveBeenCalledOnceWith(itens);
  });
});
