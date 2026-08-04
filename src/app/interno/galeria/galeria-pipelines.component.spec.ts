import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { GaleriaPipelinesComponent } from './galeria-pipelines.component';
import { PipelineService } from '../../service/pipeline.service';

/** Primeiro spec desta tela — ela não tinha nenhum, e foi onde moraram dois defeitos que o aluno via:
 *  um filtro "Minha Turma" que devolvia SEMPRE lista vazia (filtrava os não-públicos dentro de uma
 *  lista que o endpoint entrega só com públicos) e um cartão que exibia "0 cópias" e 5 estrelas
 *  cravadas no cliente, como se fossem medição do servidor.
 *
 *  O filtro por turma agora é real: quem decide o pertencimento é o servidor, no `da_minha_turma`. */
describe('GaleriaPipelinesComponent', () => {
  let component: GaleriaPipelinesComponent;
  let fixture: ComponentFixture<GaleriaPipelinesComponent>;
  let pipelineService: jasmine.SpyObj<PipelineService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  /** Item como o backend o entrega (nomes em snake_case, do `_pipeline_doc`). */
  const doDominio = (over: any = {}) => ({
    id: 'p1', nome: 'Classificar flores', descricao: 'iris',
    is_public: true, dificuldade: 'iniciante', tags: ['classificacao'],
    modeloSelecionado: { label: 'k-NN' },
    resultadoColetaDado: { dataset_nome: 'iris' },
    da_minha_turma: false, turma_nome: null,
    ...over,
  });

  const montar = (itens: any[]) => {
    pipelineService.listarPipelinesProfessores.and.returnValue(of(itens as any));
    fixture = TestBed.createComponent(GaleriaPipelinesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    pipelineService = jasmine.createSpyObj('PipelineService', [
      'listarPipelinesProfessores', 'copiarPipeline',
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      declarations: [GaleriaPipelinesComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: PipelineService, useValue: pipelineService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    })
      .overrideComponent(GaleriaPipelinesComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('should create', () => {
    montar([]);
    expect(component).toBeTruthy();
  });

  describe('filtro por turma', () => {
    it('não oferece o filtro quando nenhum item é da minha turma', () => {
      // É o ponto central: filtro que só pode devolver lista vazia não deve existir na tela.
      montar([doDominio(), doDominio({ id: 'p2' })]);

      expect(component.temItensDaMinhaTurma).toBeFalse();
    });

    it('oferece o filtro quando há item da minha turma', () => {
      montar([doDominio(), doDominio({ id: 'p2', da_minha_turma: true, turma_nome: 'Turma de IA' })]);

      expect(component.temItensDaMinhaTurma).toBeTrue();
    });

    it('com o filtro ligado, mostra só os da minha turma', () => {
      montar([
        doDominio({ id: 'publico' }),
        doDominio({ id: 'daTurma', da_minha_turma: true, turma_nome: 'Turma de IA' }),
      ]);

      component.filtroTurma = 'minha';

      expect(component.pipelinesFiltrados.map(p => p.id)).toEqual(['daTurma']);
    });

    it('com o filtro em "todos", mostra a galeria inteira', () => {
      montar([
        doDominio({ id: 'publico' }),
        doDominio({ id: 'daTurma', da_minha_turma: true, turma_nome: 'Turma de IA' }),
      ]);

      expect(component.filtroTurma).toBe('todos');
      expect(component.pipelinesFiltrados.length).toBe(2);
    });

    it('combina com o filtro de dificuldade', () => {
      montar([
        doDominio({ id: 'facil', da_minha_turma: true, turma_nome: 'T', dificuldade: 'iniciante' }),
        doDominio({ id: 'dificil', da_minha_turma: true, turma_nome: 'T', dificuldade: 'avancado' }),
      ]);

      component.filtroTurma = 'minha';
      component.filtroDificuldade = 'avancado';

      expect(component.pipelinesFiltrados.map(p => p.id)).toEqual(['dificil']);
    });
  });

  describe('mapeamento do que vem do servidor', () => {
    it('traz o nome da turma só quando o servidor manda', () => {
      montar([
        doDominio({ id: 'comNome', da_minha_turma: true, turma_nome: 'Turma de IA' }),
        doDominio({ id: 'semNome' }),
      ]);

      expect(component.pipelines[0].turma).toBe('Turma de IA');
      expect(component.pipelines[0].daMinhaTurma).toBeTrue();
      expect(component.pipelines[1].turma).toBeUndefined();
      expect(component.pipelines[1].daMinhaTurma).toBeFalse();
    });

    it('não inventa contagem de cópias nem nota', () => {
      // Os dois campos eram constantes cravadas no cliente e apareciam como medição.
      montar([doDominio()]);

      expect((component.pipelines[0] as any).totalCopias).toBeUndefined();
      expect((component.pipelines[0] as any).avaliacao).toBeUndefined();
    });

    it('usa dataset e modelo, que vêm do servidor', () => {
      montar([doDominio()]);

      expect(component.pipelines[0].dataset).toBe('iris');
      expect(component.pipelines[0].modelo).toBe('k-NN');
    });
  });

  describe('busca', () => {
    it('procura em nome, descrição e tags', () => {
      montar([
        doDominio({ id: 'a', nome: 'Classificar flores' }),
        doDominio({ id: 'b', nome: 'Prever preços', descricao: 'casas', tags: ['regressao'] }),
      ]);

      component.termoBusca = 'regress';

      expect(component.pipelinesFiltrados.map(p => p.id)).toEqual(['b']);
    });
  });

  it('avisa quando a galeria falha, em vez de ficar carregando para sempre', () => {
    pipelineService.listarPipelinesProfessores.and.returnValue(throwError(() => new Error('rede')));
    fixture = TestBed.createComponent(GaleriaPipelinesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.carregando).toBeFalse();
    expect(snackBar.open).toHaveBeenCalled();
  });
});
