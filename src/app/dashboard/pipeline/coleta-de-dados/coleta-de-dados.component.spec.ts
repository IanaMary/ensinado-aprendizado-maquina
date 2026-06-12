import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ColetaDeDadosComponent } from './coleta-de-dados.component';

describe('ColetaDeDadosComponent', () => {
  let component: ColetaDeDadosComponent;
  let fixture: ComponentFixture<ColetaDeDadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ColetaDeDadosComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(ColetaDeDadosComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ColetaDeDadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
