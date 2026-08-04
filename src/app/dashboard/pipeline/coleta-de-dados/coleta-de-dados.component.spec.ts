import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { ColetaDeDadosComponent } from './coleta-de-dados.component';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

/** O arrastar da paleta para a raia é COMO O ALUNO monta o pipeline, e não tinha teste algum —
 *  nem aqui nem nos outros três componentes de paleta, todos com o mesmo `onItemDropped`.
 *
 *  Mecanismo, que não é óbvio: a paleta NÃO declara `cdkDropListConnectedTo`, então soltar o item
 *  sobre uma raia não é um drop válido para o CDK — o `dropped` volta a ser emitido pela PRÓPRIA
 *  paleta, e é esse evento que o handler usa para empurrar o item à raia pelo serviço. Funciona,
 *  mas por efeito colateral de um drop inválido. Estes testes fixam o comportamento observável
 *  para que uma futura refatoração do drag-and-drop não o quebre em silêncio.
 *
 *  É desse mecanismo que vinha o defeito corrigido em `arrasto-cancelado.ts`: como TODO drop é um
 *  drop na própria paleta, o handler adicionava o item independentemente de onde o ponteiro
 *  terminasse — desistir de um arrasto era impossível. */
describe('ColetaDeDadosComponent', () => {
  let component: ColetaDeDadosComponent;
  let fixture: ComponentFixture<ColetaDeDadosComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;

  const item = (over: Partial<ItemPipeline> = {}): ItemPipeline => ({
    label: 'Importar Planilha', valor: 'importar_planilha', tipoItem: 'coleta-dado',
    movido: false, habilitado: true, icon: 'upload_file', id: 'c1', ...over,
  }) as ItemPipeline;

  /** Evento do CDK como o handler o consome. `sobreORecipiente` reproduz um drop VÁLIDO
   *  (ponteiro terminou dentro da lista); `false` é o caso real de soltar fora dela. */
  const eventoDrop = (dados: ItemPipeline, sobreORecipiente = false) => ({
    item: { data: dados },
    isPointerOverContainer: sobreORecipiente,
    previousIndex: 0,
    currentIndex: 0,
  }) as any;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj('DashboardService', [
      'getItensColetasDados', 'movendoItemExecucao', 'emitInfoItemClicked',
    ]);
    dashboardService.getItensColetasDados.and.returnValue(of([item()]));

    await TestBed.configureTestingModule({
      declarations: [ColetaDeDadosComponent],
      imports: [HttpClientTestingModule],
      providers: [{ provide: DashboardService, useValue: dashboardService }],
    })
      .overrideComponent(ColetaDeDadosComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(ColetaDeDadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carrega a paleta do catálogo no init', () => {
    expect(component.itens.length).toBe(1);
    expect(component.itens[0].valor).toBe('importar_planilha');
  });

  it('ao soltar, marca o item como movido e o entrega à área de trabalho', () => {
    const arrastado = item();

    component.onItemDropped(eventoDrop(arrastado));

    expect(arrastado.movido).toBeTrue();
    expect(dashboardService.movendoItemExecucao).toHaveBeenCalledWith(arrastado);
  });

  it('soltar fora da paleta (na raia) adiciona o item', () => {
    component.onItemDropped(eventoDrop(item(), false));

    expect(dashboardService.movendoItemExecucao).toHaveBeenCalledTimes(1);
  });

  it('soltar de volta SOBRE a paleta cancela o arrasto', () => {
    // O aluno pega um item, pensa melhor e larga onde pegou. Antes isso adicionava o item de todo
    // jeito, porque o handler ignorava onde o ponteiro terminou — não havia como desistir.
    const arrastado = item();

    component.onItemDropped(eventoDrop(arrastado, true));

    expect(dashboardService.movendoItemExecucao).not.toHaveBeenCalled();
    expect(arrastado.movido).toBeFalse();
  });

  it('o ⓘ pede a ficha do item ao tutor sem disparar o clique do card', () => {
    const evento = jasmine.createSpyObj('Event', ['stopPropagation', 'preventDefault']);
    const alvo = item();

    component.onInfoClick(alvo, evento);

    expect(dashboardService.emitInfoItemClicked).toHaveBeenCalledWith(alvo);
    expect(evento.stopPropagation).toHaveBeenCalled();
    expect(evento.preventDefault).toHaveBeenCalled();
  });
});
