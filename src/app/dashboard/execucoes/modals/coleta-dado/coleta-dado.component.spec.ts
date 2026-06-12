import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ColetaDadoComponent } from './coleta-dado.component';

describe('ColetaDadoComponent', () => {
  let component: ColetaDadoComponent;
  let fixture: ComponentFixture<ColetaDadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ColetaDadoComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(ColetaDadoComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ColetaDadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
