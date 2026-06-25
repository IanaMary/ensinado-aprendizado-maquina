import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsBackendComponent } from './logs-backend.component';

describe('LogsBackendComponent', () => {
  let component: LogsBackendComponent;
  let fixture: ComponentFixture<LogsBackendComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LogsBackendComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogsBackendComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
