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