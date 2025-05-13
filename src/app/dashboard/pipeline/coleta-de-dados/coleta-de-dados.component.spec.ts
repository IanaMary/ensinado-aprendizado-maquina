import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColetaDeDadosComponent } from './coleta-de-dados.component';

describe('ColetaDeDadosComponent', () => {
  let component: ColetaDeDadosComponent;
  let fixture: ComponentFixture<ColetaDeDadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColetaDeDadosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColetaDeDadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
