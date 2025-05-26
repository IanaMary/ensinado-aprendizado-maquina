import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TiposClassificadoresComponent } from './tipos-classificadores.component';

describe('TiposClassificadoresComponent', () => {
  let component: TiposClassificadoresComponent;
  let fixture: ComponentFixture<TiposClassificadoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TiposClassificadoresComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TiposClassificadoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
