import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ModalExecucaoComponent } from './modal-execucao.component';

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
});
