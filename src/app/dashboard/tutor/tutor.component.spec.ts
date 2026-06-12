import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TutorComponent } from './tutor.component';

describe('TutorComponent', () => {
  let component: TutorComponent;
  let fixture: ComponentFixture<TutorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TutorComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(TutorComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(TutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
