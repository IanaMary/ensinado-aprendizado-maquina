import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ExecucoesComponent } from './execucoes.component';
import { AuthService } from '../../service/auth/auth.service';

describe('ExecucoesComponent', () => {
  let component: ExecucoesComponent;
  let fixture: ComponentFixture<ExecucoesComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['getUsuarioRole', 'logout']);
    authService.getUsuarioRole.and.returnValue('admin');
    router = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ExecucoesComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open'), closeAll: jasmine.createSpy('closeAll') } },
        { provide: AuthService, useValue: authService },
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

  it('should toggle user menu and close when navigating', () => {
    component.alternarMenuUsuario(new Event('click'));

    expect(component.usuarioMenuAberto).toBeTrue();

    component.navegarParaProjetos();

    expect(component.usuarioMenuAberto).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/view-aluno/projetos']);
  });

  it('should logout from user menu', () => {
    component.usuarioMenuAberto = true;

    component.sair();

    expect(component.usuarioMenuAberto).toBeFalse();
    expect(authService.logout).toHaveBeenCalled();
  });
});
