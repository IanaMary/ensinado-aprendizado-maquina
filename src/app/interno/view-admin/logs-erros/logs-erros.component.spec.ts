import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogsErrosComponent } from './logs-erros.component';

describe('LogsErrosComponent', () => {
  let component: LogsErrosComponent;
  let fixture: ComponentFixture<LogsErrosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LogsErrosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LogsErrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
