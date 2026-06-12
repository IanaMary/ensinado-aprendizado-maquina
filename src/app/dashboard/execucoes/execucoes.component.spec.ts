import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ExecucoesComponent } from './execucoes.component';

describe('ExecucoesComponent', () => {
  let component: ExecucoesComponent;
  let fixture: ComponentFixture<ExecucoesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExecucoesComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open'), closeAll: jasmine.createSpy('closeAll') } },
      ],
    })
    .overrideComponent(ExecucoesComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ExecucoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
