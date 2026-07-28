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
  // Sem `lane`: o backend não diz a que etapa a peça pertence (é o que o desafio avalia).
  pecas: [
    { valor: 'arquivo', nome: 'Arquivo' },
    { valor: 'minmax_scaler', nome: 'MinMax' },
    { valor: 'knn', nome: 'k-NN' },
    { valor: 'accuracy_score', nome: 'Acurácia' },
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

  it('toque escolhe a peça e o toque na coluna a coloca; devolver volta para a bandeja', () => {
    montar();
    const knn = comp.disponiveis.find((p) => p.valor === 'knn')!;
    comp.selecionar(knn);
    expect(comp.pecaSelecionada?.valor).toBe('knn');
    comp.colocarNaLane('modelo');
    expect(comp.pecasDaLane('modelo').map((p) => p.valor)).toEqual(['knn']);
    expect(comp.disponiveis.some((p) => p.valor === 'knn')).toBeFalse();
    expect(comp.pecaSelecionada).toBeUndefined();

    comp.devolverPeca('modelo', 0);
    expect(comp.pecasDaLane('modelo').length).toBe(0);
    expect(comp.disponiveis.some((p) => p.valor === 'knn')).toBeTrue();
  });

  it('tocar de novo na peça escolhida desfaz a escolha', () => {
    montar();
    const knn = comp.disponiveis.find((p) => p.valor === 'knn')!;
    comp.selecionar(knn);
    comp.selecionar(knn);
    expect(comp.pecaSelecionada).toBeUndefined();
    comp.colocarNaLane('modelo');
    expect(comp.pecasDaLane('modelo').length).toBe(0);   // sem peça escolhida, nada acontece
  });

  it('só habilita o envio depois de usar alguma peça', () => {
    montar();
    expect(comp.podeSubmeter).toBeFalse();
    comp.selecionar(comp.disponiveis[0]);
    expect(comp.podeSubmeter).toBeFalse();               // escolher não é montar
    comp.colocarNaLane('coleta');
    expect(comp.podeSubmeter).toBeTrue();
  });

  it('envia a montagem por lane, na ordem escolhida', () => {
    montar();
    const usar = (v: string, lane: 'coleta' | 'pre_processamento' | 'modelo' | 'metrica') => {
      comp.selecionar(comp.disponiveis.find((p) => p.valor === v)!);
      comp.colocarNaLane(lane);
    };
    usar('arquivo', 'coleta');
    usar('minmax_scaler', 'pre_processamento');
    usar('knn', 'modelo');
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
    comp.selecionar(comp.disponiveis[0]);
    comp.colocarNaLane('coleta');
    comp.submeter();
    expect(comp.resultado).toBeTruthy();

    comp.tentarNovamente();
    expect(turma.obterTabuleiro).toHaveBeenCalledTimes(2);
    expect(comp.resultado).toBeUndefined();
    expect(comp.disponiveis.length).toBe(4);   // bandeja recomposta
    expect(comp.pecasDaLane('coleta').length).toBe(0);
  });

  it('NÃO corrige a coluna errada: a peça fica onde o aluno a colocou', () => {
    // O desafio mede se o aluno sabe a que etapa cada bloco pertence — mover a peça para a
    // coluna certa (ou avisar na hora) entregaria a resposta.
    montar();
    const knn = comp.disponiveis.find((p) => p.valor === 'knn')!;
    comp.selecionar(knn);
    comp.colocarNaLane('metrica');
    expect(comp.pecasDaLane('metrica').map((p) => p.valor)).toEqual(['knn']);
    expect(comp.pecasDaLane('modelo').length).toBe(0);

    comp.submeter();
    expect(turma.submeterMontagem).toHaveBeenCalledWith('t1', 'a1', {
      coleta: [], pre_processamento: [], modelo: [], metrica: ['knn'],
    });
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
