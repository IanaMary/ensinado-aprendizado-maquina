import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TiposClassificadoresComponent } from './tipos-classificadores.component';

describe('TiposClassificadoresComponent', () => {
  let component: TiposClassificadoresComponent;
  let fixture: ComponentFixture<TiposClassificadoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TiposClassificadoresComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(TiposClassificadoresComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(TiposClassificadoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
