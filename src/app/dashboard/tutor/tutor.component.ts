import { Component, Input, OnChanges, ViewEncapsulation } from '@angular/core';
import tutor from '../../constants/tutor.json';

@Component({
  selector: 'app-tutor',
  templateUrl: './tutor.component.html',
  styleUrls: ['./tutor.component.scss'],
  standalone: false
})
export class TutorComponent implements OnChanges {

  @Input() tutorGeral: any;
  @Input() resumo: string[] = [];
  @Input() explicacao: string[] = [];

  tutor = tutor;

  ngOnChanges(): void { }

}
