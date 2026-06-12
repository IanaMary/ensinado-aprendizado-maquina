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

  it('should summarize collection settings for a loaded file dataset', () => {
    component.resultadoColetaDado = {
      target: 'fruit_name',
      preverCategoria: true,
      dadosRotulados: true,
      colunas: ['mass', 'fruit_name'],
      colunasDetalhes: [],
      porcentagemTreino: 80,
      embaralharDados: true,
      estratificarDados: true,
      tipoTarget: 'Texto',
      atributos: { mass: true, fruit_name: false },
      tipos: {},
      treino: { dados: [], totalDados: 120, nomeArquivo: 'fruits_original.csv' },
      teste: { dados: [], totalDados: 30, nomeArquivo: '' },
      fonteDados: 'arquivo'
    };

    expect(component.getTituloColeta({ label: 'Dados' } as any)).toBe('fruits_original.csv');
    expect(component.getResumoFonteColeta()).toBe('Arquivo | 150 exemplos');
    expect(component.getResumoDivisaoColeta()).toBe('Treino/Teste: 80%/20%');
  });

  it('should summarize collection settings for toy datasets and explicit test files', () => {
    component.resultadoColetaDado = {
      target: 'target',
      preverCategoria: true,
      dadosRotulados: true,
      colunas: ['x', 'target'],
      colunasDetalhes: [],
      porcentagemTreino: 70,
      embaralharDados: false,
      estratificarDados: false,
      tipoTarget: 'Número',
      atributos: { x: true, target: false },
      tipos: {},
      treino: { dados: [], totalDados: 100, nomeArquivo: 'iris.csv' },
      teste: { dados: [], totalDados: 50, nomeArquivo: 'iris_test.csv' },
      fonteDados: 'dataset',
      nomeDataset: 'Iris'
    };

    expect(component.getTituloColeta({ label: 'Dados' } as any)).toBe('Iris');
    expect(component.getResumoFonteColeta()).toBe('Toy dataset | 150 exemplos');
    expect(component.getResumoDivisaoColeta()).toBe('Treino: 100 | Teste enviado: 50');
  });
});
