import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MobileTab {
  label: string;
  link: string;
  icon: string;
}

const MOBILE_TABS: readonly MobileTab[] = [
  { label: 'Trang chủ', link: '/feed', icon: 'bi-house' },
  { label: 'Đăng đơn', link: '/my-posts', icon: 'bi-plus-circle' },
  { label: 'Đơn hàng', link: '/orders', icon: 'bi-calendar2-check' },
  { label: 'Messenger', link: '/messages', icon: 'bi-chat-dots' },
  { label: 'Ant Xu', link: '/wallet', icon: 'bi-coin' },
  { label: 'Tài khoản', link: '/account', icon: 'bi-person' },
];

@Component({
  selector: 'app-mobile-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-tab-bar.html',
  styleUrl: './mobile-tab-bar.scss',
})
export class MobileTabBar {
  protected readonly tabs = MOBILE_TABS;
}
