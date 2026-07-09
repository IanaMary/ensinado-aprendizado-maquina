import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ShellComponent } from './shell/shell.component';
import { TopbarComponent } from './topbar/topbar.component';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { UserMenuComponent } from './user-menu/user-menu.component';
import { BrandLogoComponent } from './brand-logo/brand-logo.component';
import { MarkdownPipe } from '../dashboard/chat-tutor/markdown.pipe';

@NgModule({
  declarations: [
    ShellComponent,
    BreadcrumbComponent,
    UserMenuComponent,
    BrandLogoComponent,
    TopbarComponent,
    MarkdownPipe
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatRadioModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatButtonModule
  ],
  exports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatRadioModule,
    MatTabsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    ShellComponent,
    BreadcrumbComponent,
    UserMenuComponent,
    BrandLogoComponent,
    TopbarComponent,
    MarkdownPipe
  ],
  providers: []
})
export class SharedModule { }
