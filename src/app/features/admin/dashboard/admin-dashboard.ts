import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import type {
  AdminActivityTrendPoint,
  AdminDashboardRange,
  AdminDashboardSummary,
  AdminKpi,
  AdminOperationalActivity,
  AdminSlaSummary,
} from '../../../core/models';
import { AdminDashboardStore } from '../../../core/stores';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { adminLabel } from '../shared/admin-labels';

type ActivityMetric = 'accounts' | 'posts' | 'completedOrders';

const CHART_PALETTE = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'];
const DONUT_RADIUS = 40;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink, SlicePipe, DecimalPipe, AdminConfirmDialog],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard implements OnInit {
  protected readonly dashboard = inject(AdminDashboardStore);
  protected readonly ranges: AdminDashboardRange[] = [7, 30, 90];
  protected readonly metrics: { key: ActivityMetric; label: string }[] = [
    { key: 'accounts', label: 'Tài khoản' },
    { key: 'posts', label: 'Bài đăng' },
    { key: 'completedOrders', label: 'Đơn hoàn thành' },
  ];
  protected readonly selectedMetric = signal<ActivityMetric>('accounts');
  protected readonly selectedMetricSummary = computed(() => {
    const points = this.dashboard.summary()?.activityTrend ?? [];
    const metric = this.metrics.find((item) => item.key === this.selectedMetric())!;
    const total = points.reduce((sum, point) => sum + point[this.selectedMetric()], 0);
    const latest = points.at(-1)?.[this.selectedMetric()] ?? 0;
    return `${metric.label}: ${total} trong kỳ, ${latest} ở mốc gần nhất.`;
  });
  protected readonly selectedRegion = signal<string>('all');
  protected readonly selectedRegionLabel = computed(() => {
    const labels: Record<string, string> = {
      all: 'Tất cả khu vực',
      'khu-a': 'Khu A',
      'khu-b': 'Khu B',
      'khu-c': 'Khu C',
    };
    return labels[this.selectedRegion()] || 'Tất cả khu vực';
  });
  protected readonly label = adminLabel;
  protected readonly exportConfirmationOpen = signal(false);
  protected readonly exportRequest = {
    title: 'Xuất báo cáo tổng quan?',
    message: 'CSV sẽ tổng hợp các chỉ số vận hành đang hiển thị và được ghi vào nhật ký kiểm toán.',
    confirmLabel: 'Xuất báo cáo',
    cancelLabel: 'Hủy',
  };

  protected readonly currentTime = computed(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });

  protected readonly tokenRevenue = computed(() => {
    const summary = this.dashboard.summary();
    if (!summary) return '48,5';
    // Tính doanh thu từ completed orders, ước tính ~50k mỗi đơn
    const revenue = summary.marketplaceHealth.completedOrdersInRange * 0.05;
    return revenue.toFixed(1).replace('.', ',');
  });

  protected readonly categoryList = computed(() => {
    const mix = this.dashboard.summary()?.serviceCategoryMix ?? [];
    return mix.map((item, index) => ({
      name: adminLabel(item.category),
      percent: item.percent,
      color: CHART_PALETTE[index % CHART_PALETTE.length],
    }));
  });

  protected readonly categoryTotal = computed(() =>
    (this.dashboard.summary()?.serviceCategoryMix ?? []).reduce((sum, item) => sum + item.total, 0),
  );

  protected readonly categoryDonutSegments = computed(() => {
    let offset = 0;
    return this.categoryList().map((item) => {
      const length = (item.percent / 100) * DONUT_CIRCUMFERENCE;
      const segment = {
        color: item.color,
        dasharray: `${length} ${DONUT_CIRCUMFERENCE - length}`,
        dashoffset: -offset,
      };
      offset += length;
      return segment;
    });
  });

  ngOnInit(): void {
    this.dashboard.load();
  }

  protected setRange(range: AdminDashboardRange): void {
    this.dashboard.setRange(range);
  }

  protected setRegion(region: string): void {
    this.selectedRegion.set(region);
  }

  protected refresh(): void {
    this.dashboard.load();
  }

  protected confirmExportReport(): void {
    this.exportConfirmationOpen.set(false);
    this.dashboard.requestReportExport();
  }

  protected exportStatusText(): string {
    const state = this.dashboard.exportState();
    if (state === 'pending') return 'Đang gửi yêu cầu xuất báo cáo...';
    if (state === 'success') return 'Đã tạo yêu cầu xuất báo cáo tổng quan.';
    if (state === 'error') return 'Không thể tạo yêu cầu xuất báo cáo.';
    return '';
  }

  protected sparkline(kpi: AdminKpi): string {
    if (!kpi.trend.length) return '0,32 100,32';
    const max = Math.max(...kpi.trend, 1);
    return kpi.trend
      .map(
        (value, index) =>
          `${(index / Math.max(kpi.trend.length - 1, 1)) * 100},${32 - (value / max) * 28}`,
      )
      .join(' ');
  }

  protected activityPoints(values: number[]): string {
    if (!values.length) return '0,64 100,64';
    const max = Math.max(...values, 1);
    return values
      .map(
        (value, index) =>
          `${(index / Math.max(values.length - 1, 1)) * 100},${64 - (value / max) * 58}`,
      )
      .join(' ');
  }

  protected activitySeries(
    points: AdminActivityTrendPoint[],
    key: 'accounts' | 'posts' | 'completedOrders',
  ): string {
    return this.activityPoints(points.map((point) => point[key]));
  }

  protected activityAreaPath(
    points: AdminActivityTrendPoint[],
    key: 'accounts' | 'posts' | 'completedOrders',
  ): string {
    const series = points.map((point) => point[key]);
    if (!series.length) return 'M0,64 L100,64 Z';
    const max = Math.max(...series, 1);
    const coordinates = series.map((value, index) => {
      const x = (index / Math.max(series.length - 1, 1)) * 100;
      const y = 64 - (value / max) * 58;
      return `${x},${y}`;
    });
    return `M0,64 L${coordinates.join(' L')} L100,64 Z`;
  }

  protected getMaxActivity(
    points: AdminActivityTrendPoint[],
    key: 'accounts' | 'posts' | 'completedOrders',
  ): number {
    return Math.max(...points.map((p) => p[key]), 1);
  }

  protected safeDiv(a: number, b: number): number {
    return b === 0 ? 0 : a / b;
  }

  protected chartStep(count: number): number {
    return Math.max(count - 1, 1);
  }

  protected categoryColor(category: string): string {
    const colors: Record<string, string> = {
      quality: 'rgb(239, 68, 68)',
      payment: 'rgb(249, 115, 22)',
      schedule: 'rgb(59, 130, 246)',
      conduct: 'rgb(16, 185, 129)',
      other: 'rgb(107, 114, 128)',
    };
    return colors[category] || colors['other'];
  }

  protected kpiRoute(kpi: AdminKpi): string {
    const routes: Record<AdminKpi['key'], string> = {
      accounts: '/admin/users',
      activeOrders: '/orders',
      pendingModeration: '/admin/moderation',
      openComplaints: '/admin/complaints',
    };
    return routes[kpi.key];
  }

  protected kpiQuery(kpi: AdminKpi): Record<string, string> {
    if (kpi.key === 'pendingModeration') return { status: 'pending' };
    if (kpi.key === 'openComplaints') return { stage: 'all' };
    return {};
  }

  protected roundedChange(kpi: AdminKpi): number {
    return Math.round(kpi.changePct);
  }

  protected riskSummary(summary: AdminDashboardSummary): string {
    const risk = summary.complaintSla.overdue + summary.complaintSla.dueSoon;
    if (!risk) return 'Không có hồ sơ gần hạn trong kỳ.';
    return `${summary.complaintSla.overdue} quá hạn, ${summary.complaintSla.dueSoon} sắp đến hạn.`;
  }

  protected slaTotal(summary: AdminDashboardSummary): number {
    const sla = summary.complaintSla;
    return sla.withinSla + sla.dueSoon + sla.overdue;
  }

  protected slaPercent(summary: AdminDashboardSummary, key: keyof AdminSlaSummary): number {
    return this.percent(summary.complaintSla[key], this.slaTotal(summary));
  }

  protected percent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  protected healthItems(summary: AdminDashboardSummary): { label: string; value: number }[] {
    return [
      { label: 'Bài đang mở', value: summary.marketplaceHealth.openPosts },
      { label: 'Bài đã ẩn', value: summary.marketplaceHealth.hiddenPosts },
      { label: 'Đơn đang xử lý', value: summary.marketplaceHealth.activeOrders },
      { label: 'Đơn hoàn thành trong kỳ', value: summary.marketplaceHealth.completedOrdersInRange },
      { label: 'Đơn có rủi ro đảm bảo', value: summary.marketplaceHealth.escrowRiskOrders },
    ];
  }

  protected ownershipItems(summary: AdminDashboardSummary): { label: string; value: number }[] {
    return [
      { label: 'Khiếu nại đã phân công', value: summary.ownership.assignedComplaints },
      { label: 'Khiếu nại chưa phân công', value: summary.ownership.unassignedComplaints },
      { label: 'Báo cáo đã phân công', value: summary.ownership.assignedReports },
      { label: 'Báo cáo chưa phân công', value: summary.ownership.unassignedReports },
      {
        label: 'Việc của tôi',
        value: summary.ownership.mineComplaints + summary.ownership.mineReports,
      },
    ];
  }

  protected categoryLabel(value: string): string {
    return adminLabel(value);
  }

  protected activityQuery(activity: AdminOperationalActivity): Record<string, string> {
    return activity.queryParam && activity.queryValue
      ? { [activity.queryParam]: activity.queryValue }
      : {};
  }

  protected activityLabel(activity: AdminOperationalActivity): string {
    return activity.label.replace(
      /received|verifying|collecting_evidence|evaluating|resolving|notified|resolved|pending|hidden|dismissed/g,
      (value) => adminLabel(value),
    );
  }
}
