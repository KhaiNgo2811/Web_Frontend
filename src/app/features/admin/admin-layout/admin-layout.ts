import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter, startWith } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionStore } from '../../../core/stores';
import { hasAdminPermission, type AdminPermission } from '../../../core/models';

interface AdminNavItem {
  label: string;
  route: string;
  icon: string;
  permission?: AdminPermission;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  protected readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly accountMenuOpen = signal(false);
  protected readonly pageTitle = signal('Tổng quan vận hành');
  protected readonly navItems: AdminNavItem[] = [
    {
      label: 'Hộp thư',
      route: '/admin/inbox',
      icon: 'M4 4h16v12H5.2L4 17.2V4Zm4 4h8v2H8V8Zm0 4h5v2H8v-2Z',
    },
    {
      label: 'Tổng quan',
      route: '/admin',
      icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z',
    },
    {
      label: 'Tài khoản',
      route: '/admin/users',
      icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 1 1 16 0H4Z',
    },
    {
      label: 'Kiểm duyệt',
      route: '/admin/moderation',
      icon: 'M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6l-8-3Zm-1 12.2-3-3 1.4-1.4 1.6 1.6 3.6-3.6L16 10.2l-5 5Z',
    },
    {
      label: 'Khiếu nại',
      route: '/admin/complaints',
      icon: 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm1 13h-2v-2h2v2Zm0-4h-2V7h2v5Z',
    },
    {
      label: 'Cấu hình',
      route: '/admin/config',
      permission: 'configuration.manage',
      icon: 'M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a7.8 7.8 0 0 0-2.6-1.5L14 2h-4l-.4 3a7.8 7.8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5A9.8 9.8 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a7.8 7.8 0 0 0 2.6 1.5l.4 3h4l.4-3a7.8 7.8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z',
    },
    {
      label: 'Nhật ký',
      route: '/admin/audit',
      permission: 'audit.read',
      icon: 'M6 2h9l3 3v17H6V2Zm8 1.5V6h2.5L14 3.5ZM8 9h8v2H8V9Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z',
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        let activeRoute = this.route;
        while (activeRoute.firstChild) activeRoute = activeRoute.firstChild;
        this.pageTitle.set(activeRoute.snapshot.data['adminTitle'] ?? 'Tổng quan vận hành');
        this.accountMenuOpen.set(false);
      });
  }

  protected canAccess(permission?: AdminPermission): boolean {
    return !permission || hasAdminPermission(this.session.currentUser()?.role ?? '', permission);
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected toggleAccountMenu(): void {
    this.accountMenuOpen.update((open) => !open);
  }

  protected logout(): void {
    this.session.logout();
    void this.router.navigate(['/auth/login']);
  }

  @HostListener('document:keydown.escape')
  protected closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }
}
