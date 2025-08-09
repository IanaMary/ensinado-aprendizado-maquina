import { NgModule } from '@angular/core';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MatIconRegistry } from '@angular/material/icon';
import { ConfTutorModule } from './interno/conf-tutor/conf-tutor.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule,
    AppRoutingModule,
    DashboardModule,
    ConfTutorModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  constructor(private iconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) {
    this.iconRegistry.addSvgIcon(
      'tutor',
      this.sanitizer.bypassSecurityTrustResourceUrl('assets/icons/tutor.svg')
    );
  }
}
