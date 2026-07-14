import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.RegisterPage),
      },
      {
        path: 'register/verify',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.RegisterPage),
      },
      {
        path: 'register/success',
        loadComponent: () =>
          import('./features/auth/register/register').then((m) => m.RegisterPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/password-recovery/password-recovery').then(
            (m) => m.PasswordRecoveryPage,
          ),
      },
      {
        path: 'forgot-password/verify',
        loadComponent: () =>
          import('./features/auth/password-recovery/password-recovery').then(
            (m) => m.PasswordRecoveryPage,
          ),
      },
      {
        path: 'forgot-password/reset',
        loadComponent: () =>
          import('./features/auth/password-recovery/password-recovery').then(
            (m) => m.PasswordRecoveryPage,
          ),
      },
      {
        path: 'forgot-password/success',
        loadComponent: () =>
          import('./features/auth/password-recovery/password-recovery').then(
            (m) => m.PasswordRecoveryPage,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: 'admin',
    title: 'Quản trị | AntGo',
    data: { adminTitle: 'Tổng quan vận hành' },
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Tổng quan vận hành | AntGo',
        data: { adminTitle: 'Tổng quan vận hành' },
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'users',
        title: 'Quản lý tài khoản | AntGo',
        data: { adminTitle: 'Quản lý tài khoản' },
        loadComponent: () => import('./features/admin/users/admin-users').then((m) => m.AdminUsers),
      },
      {
        path: 'inbox',
        title: 'Hộp thư công việc | AntGo',
        data: { adminTitle: 'Hộp thư công việc' },
        loadComponent: () => import('./features/admin/inbox/admin-inbox').then((m) => m.AdminInbox),
      },
      {
        path: 'moderation',
        title: 'Kiểm duyệt nội dung | AntGo',
        data: { adminTitle: 'Kiểm duyệt nội dung' },
        loadComponent: () =>
          import('./features/admin/moderation/admin-moderation').then((m) => m.AdminModeration),
      },
      {
        path: 'reviews',
        title: 'Đánh giá & Uy tín | AntGo',
        data: { adminTitle: 'Đánh giá & Uy tín' },
        loadComponent: () =>
          import('./features/admin/reviews/admin-reviews').then((m) => m.AdminReviews),
      },
      {
        path: 'complaints',
        title: 'Xử lý khiếu nại | AntGo',
        data: { adminTitle: 'Xử lý khiếu nại' },
        loadComponent: () =>
          import('./features/admin/complaints/admin-complaints').then((m) => m.AdminComplaints),
      },
      {
        path: 'config',
        canActivate: [adminGuard],
        title: 'Cấu hình nghiệp vụ | AntGo',
        data: { permission: 'configuration.manage', adminTitle: 'Cấu hình nghiệp vụ' },
        loadComponent: () =>
          import('./features/admin/config/admin-config').then((m) => m.AdminConfig),
      },
      {
        path: 'token-transactions',
        title: 'Giao dịch & Token | AntGo',
        data: { adminTitle: 'Giao dịch & Token' },
        loadComponent: () =>
          import('./features/admin/token-transactions/admin-token-transactions').then(
            (m) => m.AdminTokenTransactions,
          ),
      },
      {
        path: 'reports',
        title: 'Báo cáo vi phạm | AntGo',
        data: { adminTitle: 'Báo cáo vi phạm' },
        loadComponent: () =>
          import('./features/admin/reports/admin-reports').then((m) => m.AdminReports),
      },
      {
        path: 'audit',
        canActivate: [adminGuard],
        title: 'Nhật ký kiểm toán | AntGo',
        data: { permission: 'audit.read', adminTitle: 'Nhật ký kiểm toán' },
        loadComponent: () => import('./features/admin/audit/admin-audit').then((m) => m.AdminAudit),
      },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: 'feed', loadComponent: () => import('./features/feed/feed').then((m) => m.Feed) },
      {
        path: 'posts/new',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/posts/post-chooser/post-chooser').then((m) => m.PostChooser),
      },
      {
        path: 'my-posts',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/posts/my-posts/my-posts').then((m) => m.MyPostsPage),
      },
      {
        path: 'posts/new/request',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/posts/post-editor/post-editor').then((m) => m.PostEditor),
      },
      {
        path: 'posts/new/service',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/posts/post-editor/post-editor').then((m) => m.PostEditor),
      },
      {
        path: 'posts/:id/edit',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/posts/post-editor/post-editor').then((m) => m.PostEditor),
      },
      {
        path: 'posts/:id',
        loadComponent: () =>
          import('./features/feed/post-detail-page/post-detail-page').then((m) => m.PostDetailPage),
      },
      {
        path: 'orders',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/orders-workspace/orders-workspace').then(
            (m) => m.OrdersWorkspace,
          ),
      },
      {
        path: 'orders/:id',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/orders/orders-workspace/orders-workspace').then(
            (m) => m.OrdersWorkspace,
          ),
      },
      {
        path: 'messages',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/messages/messages-page/messages-page').then((m) => m.MessagesPage),
      },
      {
        path: 'messages/:conversationId',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/messages/messages-page/messages-page').then((m) => m.MessagesPage),
      },
      {
        path: 'wallet',
        title: 'Ví Ant Xu | AntGo',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/wallet/wallet-page/wallet-page').then((m) => m.WalletPage),
      },
      {
        path: 'wallet/history',
        title: 'Ant Xu: Lịch sử giao dịch | AntGo',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/wallet/wallet-history/wallet-history').then((m) => m.WalletHistory),
      },
      {
        path: 'notifications',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/notifications/notifications-page/notifications-page').then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/account/account-page/account-page').then((m) => m.AccountPage),
      },
      {
        path: 'policy',
        title: 'Điều khoản và chính sách | AntGo',
        loadComponent: () =>
          import('./features/policy/policy-page/policy-page').then((m) => m.PolicyPage),
      },
      {
        path: 'about',
        title: 'Giới thiệu AntGo | AntGo',
        loadComponent: () => import('./features/about/about-page/about-page').then((m) => m.AboutPage),
      },
      {
        path: 'help',
        title: 'Trợ giúp & Góp ý | AntGo',
        loadComponent: () => import('./features/help/help-page/help-page').then((m) => m.HelpPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'feed' },
    ],
  },
  { path: '**', redirectTo: 'feed' },
];
