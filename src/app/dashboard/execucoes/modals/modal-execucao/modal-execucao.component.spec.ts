import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalExecucaoComponent } from './modal-execucao.component';

describe('ModalExecucaoComponent', () => {
  let component: ModalExecucaoComponent;
  let fixture: ComponentFixture<ModalExecucaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalExecucaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalExecucaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
