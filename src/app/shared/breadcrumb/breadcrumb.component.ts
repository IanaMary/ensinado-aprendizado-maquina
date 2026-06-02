import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
  selector: 'app-breadcrumb',
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li *ngFor="let item of breadcrumbs; let last = last" [class.active]="last">
          <a *ngIf="!last" (click)="navigate(item.url)">{{ item.label }}</a>
          <span *ngIf="last">{{ item.label }}</span>
          <mat-icon *ngIf="!last" class="separator">chevron_right</mat-icon>
        </li>
      </ol>
    </nav>
  `,
  styles: [`
    @import '../../../styles/colores.scss';

    .breadcrumb {
      ol {
        display: flex;
        align-items: center;
        list-style: none;
        margin: 0;
        padding: 0;
        gap: 4px;
      }

      li {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        color: $cinza-medio;

        a {
          color: $roxo-medio;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s;

          &:hover {
            color: $roxo-vibrante;
            text-decoration: underline;
          }
        }

        &.active {
          color: $roxo-escuro;
          font-weight: 600;
        }

        .separator {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: $cinza-medio;
        }
      }
    }
  `],
  standalone: false
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: Breadcrumb[] = [];
  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
    
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  navigate(url: string): void {
    this.router.navigate([url]);
  }

  private buildBreadcrumbs(route: ActivatedRoute, url: string = '', breadcrumbs: Breadcrumb[] = []): Breadcrumb[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const label = child.snapshot.data['breadcrumb'];
      if (label !== undefined && label !== '') {
        breadcrumbs.push({ label, url });
      }

      return this.buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }
}
