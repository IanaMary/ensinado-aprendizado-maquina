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