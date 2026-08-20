import { isStandalone, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ChatTutorComponent } from './chat-tutor.component';
import { DashboardService } from '../services/dashboard.service';
import { AtividadeService } from '../../service/atividade/atividade.service';

/** A pergunta que falha não pode ficar no histórico.
 *
 *  Defeito de 18/08: com o tutor fora do ar, cada tentativa deixava um turno 'user' sem
 *  resposta em `mensagens`; a pergunta seguinte reenviava todos eles no mesmo POST (turnos
 *  'user' seguidos) e a tela mostrava a mesma pergunta repetida. */
describe('ChatTutorComponent — turno que falha', () => {
  let component: ChatTutorComponent;
  let dashboard: any;

  beforeEach(async () => {
    dashboard = {
      obterModeloLLM: () => of({ modelo: 'modelo-de-teste' }),
      chatTutorStream: jasmine.createSpy('chatTutorStream'),
      chatHistoricoListar: () => of([]),
      chatHistoricoCriar: () => of({ id: 'c1' }),
      chatHistoricoAtualizar: () => of({}),
    };

    // O componente é `standalone: true` na branch de produção e `standalone: false` (declarado
    // no `DashboardModule`) na branch com Trilha/Léo. Um spec com `imports:` fixo quebra na
    // segunda com "Unexpected directive imported by the module" — foi o que aconteceu, e só
    // apareceu ao rodar a suíte da outra branch num clone limpo. Perguntar ao Angular qual é o
    // caso mantém UM spec servindo às duas.
    const declaracao = isStandalone(ChatTutorComponent)
      ? { imports: [ChatTutorComponent] }
      : { declarations: [ChatTutorComponent], schemas: [NO_ERRORS_SCHEMA] };

    await TestBed.configureTestingModule({
      ...declaracao,
      providers: [
        { provide: DashboardService, useValue: dashboard },
        { provide: AtividadeService, useValue: { registrar: () => { } } },
      ],
    })
      .overrideComponent(ChatTutorComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(ChatTutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('devolve a pergunta para a caixa e não a deixa no histórico', () => {
    dashboard.chatTutorStream.and.returnValue(throwError(() => new Error('O tutor retornou um erro.')));

    component.entrada = 'o que é acuracia';
    component.enviar();

    expect(component.mensagens).toEqual([]);
    expect(component.entrada).toBe('o que é acuracia');
    expect(component.erro).toBe('O tutor retornou um erro.');
  });

  it('não reenvia a pergunta que falhou junto com a próxima', () => {
    dashboard.chatTutorStream.and.returnValue(throwError(() => new Error('erro')));
    component.entrada = 'primeira';
    component.enviar();

    // Cópia no momento da chamada: o componente passa o próprio array, e a resposta entra nele
    // depois — olhar o argumento no fim do teste mostraria o histórico já completado.
    let enviadas: string[] = [];
    dashboard.chatTutorStream.and.callFake((msgs: any[]) => {
      enviadas = msgs.map(m => m.content);
      return of('resposta');
    });
    component.entrada = 'segunda';
    component.enviar();

    expect(enviadas).toEqual(['segunda']);
  });

  it('o turno que dá certo continua no histórico', () => {
    dashboard.chatTutorStream.and.returnValue(of('acurácia é...'));

    component.entrada = 'o que é acuracia';
    component.enviar();

    expect(component.mensagens.map(m => m.role)).toEqual(['user', 'assistant']);
    expect(component.entrada).toBe('');
  });
});
