import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./layout/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginPage) },
      { path: 'register', loadComponent: () => import('./features/auth/register/register').then((m) => m.RegisterPage) },
      { path: 'register/verify', loadComponent: () => import('./features/auth/register/register').then((m) => m.RegisterPage) },
      { path: 'register/success', loadComponent: () => import('./features/auth/register/register').then((m) => m.RegisterPage) },
      { path: 'forgot-password', loadComponent: () => import('./features/auth/password-recovery/password-recovery').then((m) => m.PasswordRecoveryPage) },
      { path: 'forgot-password/reset', loadComponent: () => import('./features/auth/password-recovery/password-recovery').then((m) => m.PasswordRecoveryPage) },
      { path: 'forgot-password/success', loadComponent: () => import('./features/auth/password-recovery/password-recovery').then((m) => m.PasswordRecoveryPage) },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      { path: 'feed', loadComponent: () => import('./features/feed/feed').then((m) => m.Feed) },
      { path: 'posts/new', canActivate: [authGuard], loadComponent: () => import('./features/posts/post-chooser/post-chooser').then((m) => m.PostChooser) },
      { path: 'posts/new/request', canActivate: [authGuard], loadComponent: () => import('./features/posts/post-editor/post-editor').then((m) => m.PostEditor) },
      { path: 'posts/new/service', canActivate: [authGuard], loadComponent: () => import('./features/posts/post-editor/post-editor').then((m) => m.PostEditor) },
      { path: 'posts/:id/edit', canActivate: [authGuard], loadComponent: () => import('./features/posts/post-editor/post-editor').then((m) => m.PostEditor) },
      { path: 'posts/:id', loadComponent: () => import('./features/feed/post-detail-page/post-detail-page').then((m) => m.PostDetailPage) },
      { path: 'orders', canActivate: [authGuard], loadComponent: () => import('./features/orders/orders-workspace/orders-workspace').then((m) => m.OrdersWorkspace) },
      { path: 'orders/:id', canActivate: [authGuard], loadComponent: () => import('./features/orders/orders-workspace/orders-workspace').then((m) => m.OrdersWorkspace) },
      { path: 'messages', canActivate: [authGuard], loadComponent: () => import('./features/messages/messages-page/messages-page').then((m) => m.MessagesPage) },
      { path: 'messages/:conversationId', canActivate: [authGuard], loadComponent: () => import('./features/messages/messages-page/messages-page').then((m) => m.MessagesPage) },
      { path: 'notifications', canActivate: [authGuard], loadComponent: () => import('./features/notifications/notifications-page/notifications-page').then((m) => m.NotificationsPage) },
      { path: 'account', canActivate: [authGuard], loadComponent: () => import('./features/account/account-page/account-page').then((m) => m.AccountPage) },
      { path: '', pathMatch: 'full', redirectTo: 'feed' },
    ],
  },
  { path: '**', redirectTo: 'feed' },
];
