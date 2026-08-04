import { desistiuDoArrasto } from './arrasto-cancelado';

/** As quatro paletas do pipeline (coleta, pré-processamento, modelos, métricas) decidem por esta
 *  função se um drop conta ou não. Ela é a correção do defeito de que não havia como desistir de um
 *  arrasto: a paleta não declara `cdkDropListConnectedTo`, então todo drop volta para ela mesma e o
 *  handler adicionava o item onde quer que o ponteiro terminasse. */
describe('desistiuDoArrasto', () => {
  it('soltou de volta sobre a paleta: desistiu', () => {
    expect(desistiuDoArrasto({ isPointerOverContainer: true })).toBeTrue();
  });

  it('soltou fora da paleta (a raia): não desistiu', () => {
    expect(desistiuDoArrasto({ isPointerOverContainer: false })).toBeFalse();
  });

  it('sem o campo, mantém o comportamento que funciona em vez de engolir o item', () => {
    // Falha para o lado seguro de propósito: se um dia o CDK deixar de informar o campo, o pior
    // resultado aceitável é voltar a adicionar sempre — não é aceitável parar de adicionar, que
    // deixaria o aluno sem conseguir montar o pipeline.
    expect(desistiuDoArrasto({})).toBeFalse();
    expect(desistiuDoArrasto(null)).toBeFalse();
    expect(desistiuDoArrasto(undefined)).toBeFalse();
  });

  it('só o booleano verdadeiro cancela — outro valor "truthy" não conta', () => {
    expect(desistiuDoArrasto({ isPointerOverContainer: 'sim' as any })).toBeFalse();
  });
});
