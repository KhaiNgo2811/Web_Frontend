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
  isHeader?: boolean;
  badge?: number;
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
      label: 'Tổng quan',
      route: '/admin',
      icon: 'M4 6h16M4 12h16M4 18h16',
    },
    {
      label: 'QUẢN LÝ',
      route: 'header',
      icon: '',
      isHeader: true,
    },
    {
      label: 'Người dùng',
      route: '/admin/users',
      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0c1.657 0 3-4 3-4s1.343 4 3 4',
      badge: 2,
    },
    {
      label: 'Bài đăng',
      route: '/admin/moderation',
      icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
      badge: 8,
    },
    {
      label: 'Giao dịch & Token',
      route: '/admin/token-transactions',
      icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    },
    {
      label: 'Khiếu nại & Tranh chấp',
      route: '/admin/complaints',
      icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01',
      badge: 3,
    },
    {
      label: 'Đánh giá & Uy tín',
      route: '/admin/inbox',
      icon: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    },
    {
      label: 'Báo cáo vi phạm',
      route: '/admin/reports',
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      badge: 5,
    },
    {
      label: 'HỆ THỐNG',
      route: 'header',
      icon: '',
      isHeader: true,
    },
    {
      label: 'Cấu hình hệ thống',
      route: '/admin/config',
      permission: 'configuration.manage',
      icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    },
    {
      label: 'Nhật ký hoạt động',
      route: '/admin/audit',
      permission: 'audit.read',
      icon: 'M12 20h9 M12 4v16 M4 15h1 M4 10h1 M4 20h1 M4 5h1',
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
