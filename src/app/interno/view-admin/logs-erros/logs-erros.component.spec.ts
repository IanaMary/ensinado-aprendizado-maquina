import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { LogsErrosComponent } from './logs-erros.component';

describe('LogsErrosComponent', () => {
  let component: LogsErrosComponent;
  let fixture: ComponentFixture<LogsErrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],  // app-topbar (SharedModule) fora do escopo do spec
      declarations: [LogsErrosComponent],
      imports: [HttpClientTestingModule, MatIconModule, MatProgressSpinnerModule, MatTableModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LogsErrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});