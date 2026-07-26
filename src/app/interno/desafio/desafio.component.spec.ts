import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DesafioComponent } from './desafio.component';
import { TabuleiroDesafio, TurmaService } from '../../service/turma.service';
import { AuthService } from '../../service/auth/auth.service';

const TABULEIRO: TabuleiroDesafio = {
  atividade: { id: 'a1', titulo: 'Descobrir a espécie', descricao: 'Enunciado', tipo: 'montagem' },
  tentativa: 1,
  tentativas: 0,
  melhor_nota: null,
  lanes: ['coleta', 'pre_processamento', 'modelo', 'metrica'],
  pecas: [
    { valor: 'arquivo', nome: 'Arquivo', lane: 'coleta' },
    { valor: 'minmax_scaler', nome: 'MinMax', lane: 'pre_processamento' },
    { valor: 'knn', nome: 'k-NN', lane: 'modelo' },
    { valor: 'accuracy_score', nome: 'Acurácia', lane: 'metrica' },
  ],
};

describe('DesafioComponent', () => {
  let fixture: ComponentFixture<DesafioComponent>;
  let comp: DesafioComponent;
  let turma: jasmine.SpyObj<TurmaService>;

  function montar(params: Record<string, string> = { turma: 't1', atividade: 'a1' }) {
    TestBed.resetTestingModule();
    turma = jasmine.createSpyObj('TurmaService', ['obterTabuleiro', 'submeterMontagem']);
    turma.obterTabuleiro.and.returnValue(of({ ...TABULEIRO, pecas: [...TABULEIRO.pecas] }));
    turma.submeterMontagem.and.returnValue(of({
      id: 's1', tentativa: 1, nota: 7.5, nota_max: 10, pontos: 6, pontos_max: 8,
      acertou_tudo: false, melhor_nota: 7.5,
      regras: [
        { id: 'estrutura-minima', titulo: 'Completo', ok: true, peso: 3, texto: 'ok' },
        { id: 'escala-antes-de-distancia', titulo: 'Escala', ok: false, peso: 2, texto: 'falta escalar' },
      ],
    }));
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [DesafioComponent],
      providers: [
        { provide: TurmaService, useValue: turma },
        { provide: AuthService, useValue: { getUsuarioRole: () => 'aluno' } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: params } } },
      ],
    });
    fixture = TestBed.createComponent(DesafioComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('carrega o tabuleiro e põe todas as peças na bandeja', () => {
    montar();
    expect(turma.obterTabuleiro).toHaveBeenCalledWith('t1', 'a1');
    expect(comp.disponiveis.length).toBe(4);
    expect(comp.pecasDaLane('modelo').length).toBe(0);
    expect(comp.carregando).toBeFalse();
  });

  it('exige turma e atividade na URL', () => {
    montar({});
    expect(comp.erro).toContain('Desafio não informado');
    expect(turma.obterTabuleiro).not.toHaveBeenCalled();
  });

  it('clicar na peça move para a lane dela e devolver volta para a bandeja', () => {
    montar();
    const knn = comp.disponiveis.find((p) => p.valor === 'knn')!;
    comp.usarPeca(knn);
    expect(comp.pecasDaLane('modelo').map((p) => p.valor)).toEqual(['knn']);
    expect(comp.disponiveis.some((p) => p.valor === 'knn')).toBeFalse();

    comp.devolverPeca('modelo', 0);
    expect(comp.pecasDaLane('modelo').length).toBe(0);
    expect(comp.disponiveis.some((p) => p.valor === 'knn')).toBeTrue();
  });

  it('só habilita o envio depois de usar alguma peça', () => {
    montar();
    expect(comp.podeSubmeter).toBeFalse();
    comp.usarPeca(comp.disponiveis[0]);
    expect(comp.podeSubmeter).toBeTrue();
  });

  it('envia a montagem por lane, na ordem escolhida', () => {
    montar();
    const porValor = (v: string) => comp.disponiveis.find((p) => p.valor === v)!;
    comp.usarPeca(porValor('arquivo'));
    comp.usarPeca(porValor('minmax_scaler'));
    comp.usarPeca(porValor('knn'));
    comp.submeter();
    expect(turma.submeterMontagem).toHaveBeenCalledWith('t1', 'a1', {
      coleta: ['arquivo'],
      pre_processamento: ['minmax_scaler'],
      modelo: ['knn'],
      metrica: [],
    });
    expect(comp.resultado?.nota).toBe(7.5);
    expect(comp.regrasErradas.map((r) => r.id)).toEqual(['escala-antes-de-distancia']);
    expect(comp.regrasCertas.map((r) => r.id)).toEqual(['estrutura-minima']);
  });

  it('tentar de novo busca um tabuleiro novo e limpa o resultado', () => {
    montar();
    comp.usarPeca(comp.disponiveis[0]);
    comp.submeter();
    expect(comp.resultado).toBeTruthy();

    comp.tentarNovamente();
    expect(turma.obterTabuleiro).toHaveBeenCalledTimes(2);
    expect(comp.resultado).toBeUndefined();
    expect(comp.disponiveis.length).toBe(4);   // bandeja recomposta
    expect(comp.pecasDaLane('coleta').length).toBe(0);
  });

  it('marca peça fora da lane dela como aviso local', () => {
    montar();
    const knn = comp.disponiveis.find((p) => p.valor === 'knn')!;
    expect(comp.laneErrada('modelo', knn)).toBeFalse();
    expect(comp.laneErrada('metrica', knn)).toBeTrue();
  });

  it('mostra mensagem amigável quando o desafio não existe', () => {
    TestBed.resetTestingModule();
    turma = jasmine.createSpyObj('TurmaService', ['obterTabuleiro', 'submeterMontagem']);
    turma.obterTabuleiro.and.returnValue(throwError(() => ({ status: 404 })));
    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [DesafioComponent],
      providers: [
        { provide: TurmaService, useValue: turma },
        { provide: AuthService, useValue: { getUsuarioRole: () => 'aluno' } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: { turma: 't1', atividade: 'a1' } } } },
      ],
    });
    fixture = TestBed.createComponent(DesafioComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
    expect(comp.erro).toContain('não encontrado');
    expect(comp.carregando).toBeFalse();
  });
});
