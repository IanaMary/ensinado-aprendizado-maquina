import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalClasificadorComponent } from './modal-classificador.component';

describe('ModalClasificadorComponent', () => {
  let component: ModalClasificadorComponent;
  let fixture: ComponentFixture<ModalClasificadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalClasificadorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalClasificadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
