import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';

import { LogsBackendComponent } from './logs-backend.component';

describe('LogsBackendComponent', () => {
  let component: LogsBackendComponent;
  let fixture: ComponentFixture<LogsBackendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],  // app-topbar (SharedModule) fora do escopo do spec
      declarations: [LogsBackendComponent],
      imports: [HttpClientTestingModule, MatIconModule, MatProgressSpinnerModule, MatTableModule],
    }).compileComponents();

    fixture = TestBed.createComponent(LogsBackendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});