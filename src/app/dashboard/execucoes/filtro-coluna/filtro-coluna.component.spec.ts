import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltroColunaComponent } from './filtro-coluna.component';

describe('FiltroColunaComponent', () => {
  let component: FiltroColunaComponent;
  let fixture: ComponentFixture<FiltroColunaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltroColunaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiltroColunaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
