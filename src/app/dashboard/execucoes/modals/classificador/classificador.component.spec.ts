import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { ClasificadorComponent } from './classificador.component';
import { DashboardService } from '../../../services/dashboard.service';
import { SessionService } from '../../../../service/sessao-store.service';

describe('ClasificadorComponent', () => {
  let component: ClasificadorComponent;
  let fixture: ComponentFixture<ClasificadorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ClasificadorComponent],
      providers: [
        { provide: DashboardService, useValue: {} },
        { provide: SessionService, useValue: {} },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClasificadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
