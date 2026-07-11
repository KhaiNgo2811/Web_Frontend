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
import { adminLabel } from '../shared/admin-labels';

type ActivityMetric = 'accounts' | 'posts' | 'completedOrders';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterLink],
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
  protected readonly label = adminLabel;

  ngOnInit(): void {
    this.dashboard.load();
  }

  protected setRange(range: AdminDashboardRange): void {
    this.dashboard.setRange(range);
  }

  protected refresh(): void {
    this.dashboard.load();
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
