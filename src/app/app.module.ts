import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { GlobalErrorHandler } from './service/global-error-handler';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { MatIconRegistry } from '@angular/material/icon';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AtividadeInterceptor } from './interceptors/atividade.interceptor';
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    MatSnackBarModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AtividadeInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    // Chunk lazy defasado após deploy -> recarrega a página uma vez (ver classe)
    { provide: ErrorHandler, useClass: GlobalErrorHandler }
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
