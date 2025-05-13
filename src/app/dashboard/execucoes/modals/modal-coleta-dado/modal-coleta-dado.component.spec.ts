import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalColetaDadoComponent } from './modal-coleta-dado.component';

describe('ModalColetaDadoComponent', () => {
  let component: ModalColetaDadoComponent;
  let fixture: ComponentFixture<ModalColetaDadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalColetaDadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalColetaDadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
