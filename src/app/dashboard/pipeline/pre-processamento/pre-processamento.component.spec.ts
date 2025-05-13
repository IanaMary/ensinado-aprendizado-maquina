import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreProcessamentoComponent } from './pre-processamento.component';

describe('PreProcessamentoComponent', () => {
  let component: PreProcessamentoComponent;
  let fixture: ComponentFixture<PreProcessamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreProcessamentoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreProcessamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
