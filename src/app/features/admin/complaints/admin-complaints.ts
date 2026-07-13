import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  hasAdminPermission,
  type AdminConfirmationRequest,
  type Complaint,
  type ComplaintAssessment,
  type ComplaintRemedy,
  type ComplaintStage,
} from '../../../core/models';
import { AdminComplaintsStore, AdminUsersStore, SessionStore } from '../../../core/stores';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminDrawer } from '../shared/admin-drawer/admin-drawer';

type ComplaintTab = 'overview' | 'evidence' | 'timeline' | 'decision';
type ListTab = 'new' | 'processing' | 'resolved';
type SortColumn = 'code' | 'subject' | 'priority' | 'stage' | 'updatedAt';
type NotificationChannel = 'in_app' | 'email' | 'sms';
interface PendingComplaintAction {
  kind: 'act' | 'response' | 'appeal';
  complaint: Complaint;
}

@Component({
  selector: 'app-admin-complaints',
  imports: [AdminConfirmDialog, AdminDrawer, DatePipe],
  templateUrl: './admin-complaints.html',
  styleUrl: './admin-complaints.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComplaints {
  protected readonly complaints = inject(AdminComplaintsStore);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly staffDirectory = inject(AdminUsersStore);
  protected readonly tabs: ComplaintTab[] = ['overview', 'evidence', 'timeline', 'decision'];
  protected readonly complaintStages: ComplaintStage[] = [
    'received',
    'verifying',
    'collecting_evidence',
    'evaluating',
    'resolving',
    'notified',
    'resolved',
  ];
  protected readonly activeTab = signal<ComplaintTab>('overview');
  protected readonly note = signal('');
  protected readonly resolution = signal('');
  protected readonly amount = signal('');
  protected readonly assigneeId = signal('');
  protected readonly verificationValid = signal(true);
  protected readonly finding = signal<ComplaintAssessment['finding']>('shared');
  protected readonly severity = signal<ComplaintAssessment['severity']>('medium');
  protected readonly remedyType = signal<ComplaintRemedy['type']>('compensation');
  protected readonly sanctionLevel = signal<ComplaintRemedy['sanctionLevel']>(0);
  protected readonly channels = signal<NotificationChannel[]>(['in_app']);
  protected readonly responseParty = signal<'complainant' | 'respondent'>('complainant');
  protected readonly responseAccepted = signal(true);
  protected readonly localError = signal<string | null>(null);
  protected readonly announcement = signal('');
  protected readonly pendingConfirmation = signal<PendingComplaintAction | null>(null);
  protected readonly confirmationRequest = computed<AdminConfirmationRequest>(() => {
    const pending = this.pendingConfirmation();
    if (pending?.kind === 'response') {
      return {
        title: 'Ghi nhận phản hồi?',
        message: 'Phản hồi của bên đã chọn sẽ được lưu vào hồ sơ khiếu nại.',
        confirmLabel: 'Ghi phản hồi',
        cancelLabel: 'Hủy',
      };
    }
    if (pending?.kind === 'appeal') {
      return {
        title: 'Mở phúc khảo?',
        message: 'Hồ sơ sẽ quay lại bước đánh giá và yêu cầu người xem xét độc lập.',
        confirmLabel: 'Mở phúc khảo',
        cancelLabel: 'Hủy',
      };
    }
    return {
      title: `${pending ? this.actionLabel(pending.complaint) : 'Xử lý hồ sơ'}?`,
      message: 'Đây là thao tác quan trọng và sẽ được ghi vào nhật ký kiểm toán.',
      confirmLabel: pending ? this.actionLabel(pending.complaint) : 'Xác nhận',
      cancelLabel: 'Hủy',
      tone: 'danger',
    };
  });
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly sortColumn = signal<SortColumn>('updatedAt');
  protected readonly sortDirection = signal<'asc' | 'desc'>('desc');
  private readonly operationPending = signal(false);
  private draftKey = '';
  protected readonly activeListTab = signal<ListTab>('new');
  protected readonly selected = computed(() => this.complaints.selectedComplaint());
  protected readonly tabCounts = computed(() => {
    const rows = this.complaints.complaints();
    return {
      new: rows.filter((r) => r.stage === 'received').length,
      processing: rows.filter((r) =>
        ['verifying', 'collecting_evidence', 'evaluating', 'resolving', 'notified'].includes(r.stage),
      ).length,
      resolved: rows.filter((r) => r.stage === 'resolved').length,
    };
  });
  protected readonly filteredByTab = computed(() => {
    const tab = this.activeListTab();
    const rows = this.complaints.complaints();
    if (tab === 'new') return rows.filter((r) => r.stage === 'received');
    if (tab === 'processing')
      return rows.filter((r) =>
        ['verifying', 'collecting_evidence', 'evaluating', 'resolving', 'notified'].includes(r.stage),
      );
    if (tab === 'resolved') return rows.filter((r) => r.stage === 'resolved');
    return rows;
  });
  protected readonly resultCount = computed(() => this.filteredByTab().length);
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.resultCount() / this.pageSize())),
  );
  protected readonly visibleComplaints = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    const rows = [...this.filteredByTab()].sort((left, right) => {
      const a = column === 'updatedAt' ? Date.parse(left.updatedAt) : left[column];
      const b = column === 'updatedAt' ? Date.parse(right.updatedAt) : right[column];
      return typeof a === 'number' && typeof b === 'number'
        ? (a - b) * direction
        : String(a).localeCompare(String(b), 'vi') * direction;
    });
    const start = (this.page() - 1) * this.pageSize();
    return rows.slice(start, start + this.pageSize());
  });
  protected readonly hasFilters = computed(() => {
    const filter = this.complaints.filter();
    return !!filter.search || filter.stage !== 'all' || filter.priority !== 'all';
  });
  protected readonly staffOptions = computed(() => {
    return this.staffDirectory
      .users()
      .filter((user) => hasAdminPermission(user.role, 'complaints.assign'));
  });
  protected readonly canAssign = computed(() =>
    hasAdminPermission(this.session.currentUser()?.role ?? '', 'complaints.assign'),
  );
  protected readonly canDecide = computed(() =>
    hasAdminPermission(this.session.currentUser()?.role ?? '', 'complaints.decide'),
  );

  constructor() {
    this.staffDirectory.setFilter({ search: '', status: 'all', role: 'all' });
    this.route.queryParamMap.subscribe((params) => {
      const complaintId = params.get('complaint');
      const stage = params.get('stage');
      const priority = params.get('priority');
      const nextFilter = {
        stage: [
          'all',
          'received',
          'verifying',
          'collecting_evidence',
          'evaluating',
          'resolving',
          'notified',
          'resolved',
        ].includes(stage ?? '')
          ? (stage as ComplaintStage | 'all')
          : this.complaints.filter().stage,
        priority: ['all', 'normal', 'high'].includes(priority ?? '')
          ? (priority as Complaint['priority'] | 'all')
          : this.complaints.filter().priority,
      };
      const changed =
        nextFilter.stage !== this.complaints.filter().stage ||
        nextFilter.priority !== this.complaints.filter().priority;
      if (changed) {
        this.complaints.setFilter(nextFilter);
        this.complaints.select(complaintId);
      } else this.complaints.load(complaintId);
    });
    effect(() => {
      const complaint = this.selected();
      const key = complaint ? `${complaint.id}:${complaint.stage}:${!!complaint.remedy}` : '';
      if (key !== this.draftKey) {
        this.draftKey = key;
        this.resetDrafts();
      }
    });
    effect(() => {
      const loading = this.complaints.loading();
      const error = this.complaints.error();
      if (!this.operationPending() || loading) return;
      this.operationPending.set(false);
      this.announcement.set(error ? `Thao tác thất bại: ${error}` : 'Đã cập nhật hồ sơ khiếu nại.');
    });
  }

  protected open(complaint: Complaint): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { complaint: complaint.id },
      queryParamsHandling: 'merge',
    });
  }

  protected close(): void {
    this.resetDrafts();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { complaint: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setTab(tab: ComplaintTab, focus = false): void {
    this.activeTab.set(tab);
    if (focus) queueMicrotask(() => document.getElementById(`complaint-tab-${tab}`)?.focus());
  }

  protected setListTab(tab: ListTab): void {
    this.activeListTab.set(tab);
    this.page.set(1);
  }

  protected moveTab(event: KeyboardEvent, current: ComplaintTab): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = this.tabs.indexOf(current);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? this.tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + this.tabs.length) % this.tabs.length;
    this.setTab(this.tabs[next], true);
  }

  protected act(complaint: Complaint, confirmed = false): void {
    if (!this.validateAction(complaint)) return;
    if (['resolving', 'notified'].includes(complaint.stage) && !confirmed) {
      this.pendingConfirmation.set({ kind: 'act', complaint });
      return;
    }
    const note = this.note().trim();
    this.localError.set(null);
    this.announcement.set(`Đang ${this.actionLabel(complaint).toLocaleLowerCase('vi')}...`);
    this.operationPending.set(true);
    if (complaint.stage === 'received')
      this.complaints.assign({
        complaintId: complaint.id,
        note,
        assignedAdminId: this.assigneeId(),
      });
    else if (complaint.stage === 'verifying')
      this.complaints.recordVerification({
        complaintId: complaint.id,
        note,
        valid: this.verificationValid(),
        summary: note,
      });
    else if (complaint.stage === 'collecting_evidence')
      this.complaints.requestEvidence({ complaintId: complaint.id, note });
    else if (complaint.stage === 'evaluating')
      this.complaints.recordAssessment({
        complaintId: complaint.id,
        note,
        finding: this.finding(),
        rationale: note,
        severity: this.severity(),
      });
    else if (complaint.stage === 'resolving' && !complaint.remedy)
      this.complaints.decideResolution({
        complaintId: complaint.id,
        note,
        remedyType: this.remedyType(),
        resolution: this.resolution().trim(),
        amount: this.numberValue(),
        sanctionLevel: this.sanctionLevel(),
      });
    else if (complaint.stage === 'resolving')
      this.complaints.notifyParties({ complaintId: complaint.id, note, channels: this.channels() });
    else if (complaint.stage === 'notified')
      this.complaints.close({
        complaintId: complaint.id,
        note,
        remedyType: complaint.remedy?.type || 'none',
        resolution: this.resolution().trim(),
      });
  }

  protected recordSelectedResponse(complaint: Complaint, confirmed = false): void {
    const party = this.responseParty();
    const userId = party === 'complainant' ? complaint.complainantId : complaint.respondentId;
    if (!userId) return this.localError.set('Không có bên phản hồi phù hợp.');
    if (!confirmed) {
      this.pendingConfirmation.set({ kind: 'response', complaint });
      return;
    }
    this.startOperation('Đang ghi nhận phản hồi...');
    this.complaints.recordPartyResponse({
      complaintId: complaint.id,
      party,
      userId,
      accepted: this.responseAccepted(),
      note: this.note().trim(),
    });
  }

  protected appeal(complaint: Complaint, confirmed = false): void {
    if (!this.note().trim()) return this.localError.set('Cần nhập lý do phúc khảo.');
    if (!confirmed) {
      this.pendingConfirmation.set({ kind: 'appeal', complaint });
      return;
    }
    this.startOperation('Đang mở phúc khảo...');
    this.complaints.appeal({
      complaintId: complaint.id,
      requestedBy: complaint.complainantId,
      reason: this.note().trim(),
    });
  }

  protected confirmPendingAction(): void {
    const pending = this.pendingConfirmation();
    this.pendingConfirmation.set(null);
    if (!pending) return;
    if (pending.kind === 'act') this.act(pending.complaint, true);
    if (pending.kind === 'response') this.recordSelectedResponse(pending.complaint, true);
    if (pending.kind === 'appeal') this.appeal(pending.complaint, true);
  }

  private validateAction(complaint: Complaint): boolean {
    let message = '';
    if (complaint.stage === 'received' && !this.assigneeId()) message = 'Cần chọn người phụ trách.';
    else if (['verifying', 'evaluating'].includes(complaint.stage) && !this.note().trim())
      message =
        complaint.stage === 'verifying'
          ? 'Cần nhập kết quả xác minh.'
          : 'Cần nhập nhận định trách nhiệm.';
    else if (complaint.stage === 'resolving' && !complaint.remedy && !this.resolution().trim())
      message = 'Cần nhập nội dung kết luận.';
    else if (
      complaint.stage === 'resolving' &&
      !complaint.remedy &&
      this.amount().trim() &&
      (this.numberValue() === undefined || this.numberValue()! < 0)
    )
      message = 'Số tiền bồi hoàn phải là số không âm.';
    else if (complaint.stage === 'resolving' && complaint.remedy && !this.channels().length)
      message = 'Cần chọn ít nhất một kênh thông báo.';
    else if (
      complaint.stage === 'notified' &&
      !this.resolution().trim() &&
      !complaint.resolution?.trim()
    )
      message = 'Cần nhập kết luận trước khi đóng hồ sơ.';
    this.localError.set(message || null);
    return !message;
  }

  protected toggleChannel(channel: NotificationChannel, checked: boolean): void {
    this.channels.update((values) =>
      checked ? [...new Set([...values, channel])] : values.filter((value) => value !== channel),
    );
  }

  protected isChannelSelected(channel: NotificationChannel): boolean {
    return this.channels().includes(channel);
  }
  protected actionLabel(complaint: Complaint): string {
    return {
      received: 'Phân công xác minh',
      verifying: 'Ghi kết quả xác minh',
      collecting_evidence: 'Yêu cầu chứng cứ',
      evaluating: 'Ghi nhận đánh giá',
      resolving: complaint.remedy ? 'Thông báo các bên' : 'Ra quyết định',
      notified: 'Đóng hồ sơ',
      resolved: 'Đã đóng',
    }[complaint.stage];
  }
  protected complaintProgress(complaint: Complaint): number {
    const index = this.complaintStages.indexOf(complaint.stage);
    return index < 0 ? 0 : Math.round(((index + 1) / this.complaintStages.length) * 100);
  }
  protected complaintStepIndex(complaint: Complaint): number {
    return Math.max(0, this.complaintStages.indexOf(complaint.stage));
  }
  protected isCompletedStage(complaint: Complaint, stage: ComplaintStage): boolean {
    return this.complaintStages.indexOf(stage) < this.complaintStepIndex(complaint);
  }
  protected nextStepLabel(complaint: Complaint): string {
    return complaint.stage === 'resolved'
      ? 'Hồ sơ đã hoàn tất.'
      : `Tiếp theo: ${this.actionLabel(complaint)}.`;
  }
  protected slaTone(complaint: Complaint): 'danger' | 'warning' | 'success' | 'neutral' {
    const deadline = this.slaDeadline(complaint);
    if (deadline === 'Chưa thiết lập') return 'neutral';
    const remainingMs = Date.parse(deadline) - Date.now();
    if (remainingMs < 0) return 'danger';
    return remainingMs <= 24 * 3_600_000 ? 'warning' : 'success';
  }
  protected canAct(complaint: Complaint): boolean {
    return complaint.stage === 'received' ? this.canAssign() : this.canDecide();
  }
  protected canAppeal(complaint: Complaint): boolean {
    return (
      !complaint.appeal?.used &&
      !!complaint.notification?.responseDueAt &&
      complaint.remedy?.decidedBy !== this.session.currentUser()?.id
    );
  }
  protected stageLabel(stage: ComplaintStage): string {
    return {
      received: 'Tiếp nhận',
      verifying: 'Xác minh',
      collecting_evidence: 'Thu thập chứng cứ',
      evaluating: 'Đánh giá',
      resolving: 'Xử lý',
      notified: 'Đã thông báo',
      resolved: 'Đã đóng',
    }[stage];
  }
  protected priorityLabel(priority: Complaint['priority']): string {
    return priority === 'high' ? 'Cao' : 'Bình thường';
  }
  protected categoryLabel(category?: Complaint['category']): string {
    return {
      quality: 'Chất lượng',
      payment: 'Thanh toán',
      schedule: 'Tiến độ',
      conduct: 'Ứng xử',
      other: 'Khác',
    }[category || 'other'];
  }
  protected tabLabel(tab: ComplaintTab): string {
    return {
      overview: 'Tổng quan',
      evidence: 'Chứng cứ',
      timeline: 'Lịch sử',
      decision: 'Quyết định',
    }[tab];
  }
  protected findingLabel(value?: ComplaintAssessment['finding']): string {
    return value
      ? {
          complainant: 'Bên khiếu nại',
          respondent: 'Bên liên quan',
          shared: 'Hai bên',
          none: 'Không quy trách nhiệm',
        }[value]
      : 'Chưa có';
  }
  protected severityLabel(value?: ComplaintAssessment['severity']): string {
    return value
      ? { none: 'Không có', low: 'Thấp', medium: 'Trung bình', high: 'Cao' }[value]
      : 'Chưa có';
  }
  protected remedyLabel(value?: ComplaintRemedy['type']): string {
    return value
      ? {
          none: 'Không áp dụng',
          refund: 'Hoàn tiền',
          compensation: 'Bồi hoàn',
          redo: 'Làm lại',
          warning: 'Cảnh báo',
        }[value]
      : 'Chưa có';
  }
  protected responseLabel(value?: boolean): string {
    return value === undefined ? 'Chưa có' : value ? 'Chấp nhận' : 'Không chấp nhận';
  }
  protected notificationStateLabel(value?: 'pending' | 'sent'): string {
    return value === 'sent' ? 'Đã gửi' : value === 'pending' ? 'Chờ gửi' : 'Chưa gửi';
  }
  protected channelLabel(channel: string): string {
    return { in_app: 'Trong ứng dụng', email: 'Email', sms: 'SMS' }[channel] || channel;
  }
  protected isSafeEvidenceUrl(value?: string): boolean {
    if (!value) return false;
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }
  protected slaDeadline(complaint: Complaint): string {
    return (
      complaint.sla?.responseDueAt ||
      complaint.sla?.adminProcessingDueAt ||
      complaint.sla?.userEvidenceDueAt ||
      complaint.sla?.verificationDueAt ||
      'Chưa thiết lập'
    );
  }
  protected slaState(complaint: Complaint): string {
    const deadline = this.slaDeadline(complaint);
    if (deadline === 'Chưa thiết lập') return deadline;
    const remainingMs = Date.parse(deadline) - Date.now();
    if (remainingMs < 0) return 'Quá hạn';
    return `Còn ${Math.ceil(remainingMs / 3_600_000)} giờ`;
  }
  protected sort(column: SortColumn): void {
    if (this.sortColumn() === column)
      this.sortDirection.update((value) => (value === 'asc' ? 'desc' : 'asc'));
    else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
  }
  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    return this.sortColumn() !== column
      ? 'none'
      : this.sortDirection() === 'asc'
        ? 'ascending'
        : 'descending';
  }
  protected clearFilters(): void {
    this.page.set(1);
    this.complaints.setFilter({ search: '', stage: 'all', priority: 'all' });
  }
  protected refresh(): void {
    this.announcement.set('Đang làm mới danh sách khiếu nại...');
    this.operationPending.set(true);
    this.complaints.load();
  }
  protected updateStage(event: Event): void {
    this.page.set(1);
    this.complaints.setFilter({ stage: this.valueOf(event) as ComplaintStage | 'all' });
  }
  protected updatePriority(event: Event): void {
    this.page.set(1);
    this.complaints.setFilter({ priority: this.valueOf(event) as 'normal' | 'high' | 'all' });
  }
  protected updateSearch(event: Event): void {
    this.page.set(1);
    this.complaints.setFilter({ search: this.valueOf(event) });
  }
  protected updatePageSize(event: Event): void {
    this.pageSize.set(Number(this.valueOf(event)) || 10);
    this.page.set(1);
  }
  protected updateVerificationValid(event: Event): void {
    this.verificationValid.set(this.valueOf(event) === 'true');
  }
  protected updateFinding(event: Event): void {
    this.finding.set(this.valueOf(event) as ComplaintAssessment['finding']);
  }
  protected updateSeverity(event: Event): void {
    this.severity.set(this.valueOf(event) as ComplaintAssessment['severity']);
  }
  protected updateRemedyType(event: Event): void {
    this.remedyType.set(this.valueOf(event) as ComplaintRemedy['type']);
  }
  protected updateSanctionLevel(event: Event): void {
    this.sanctionLevel.set(Number(this.valueOf(event)) as ComplaintRemedy['sanctionLevel']);
  }
  protected updateResponseParty(event: Event): void {
    this.responseParty.set(this.valueOf(event) as 'complainant' | 'respondent');
  }
  protected updateResponseAccepted(event: Event): void {
    this.responseAccepted.set(this.valueOf(event) === 'true');
  }
  protected valueOf(event: Event): string {
    return event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
      ? event.target.value
      : '';
  }
  protected checkedOf(event: Event): boolean {
    return event.target instanceof HTMLInputElement && event.target.checked;
  }

  protected getInitials(name: string): string {
    return (
      name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '??'
    );
  }

  protected avatarColor(id: string): string {
    const colors = ['#f97316', '#3b82f6', '#a855f7', '#ef4444', '#10b981', '#eab308'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  protected timeAgo(date: string): string {
    const diff = Date.now() - Date.parse(date);
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Vừa xong';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return '1 tháng trước';
  }

  protected categoryBadge(category?: string): { label: string; color: string; bg: string } {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      quality: { label: 'Dịch vụ kém chất lượng', color: '#a855f7', bg: '#f3e8ff' },
      payment: { label: 'Tranh chấp đặt cọc', color: '#f43f5e', bg: '#ffe4e6' },
      schedule: { label: 'Tiến độ', color: '#3b82f6', bg: '#dbeafe' },
      conduct: { label: 'Quấy rối', color: '#eab308', bg: '#fef9c3' },
      other: { label: 'Khác', color: '#8c7b6e', bg: '#f5ebe3' },
    };
    return map[category || 'other'] || map['other'];
  }

  protected priorityBadge(priority: string): { label: string; color: string; bg: string } {
    if (priority === 'high') return { label: 'Khẩn cấp', color: '#f43f5e', bg: '#ffe4e6' };
    return { label: 'Trung bình', color: '#8c7b6e', bg: '#f5ebe3' };
  }

  protected stageBadge(stage: string): { label: string; color: string; bg: string } {
    if (stage === 'received') return { label: 'Mới', color: '#3b82f6', bg: '#dbeafe' };
    return { label: this.stageLabel(stage as ComplaintStage), color: '#8c7b6e', bg: '#f5ebe3' };
  }

  protected actionButtonLabel(stage: string): string {
    if (stage === 'received') return 'Xử lý';
    if (stage === 'resolved') return 'Xem';
    return 'Tiếp tục';
  }

  protected resolvedLabel(complaint: Complaint): string {
    return complaint.remedy?.conclusion || complaint.resolution || 'Đã đóng';
  }

  protected resolvedAdmin(complaint: Complaint): string {
    return complaint.assignedAdmin?.displayName || complaint.assignedAdminId || 'Hệ thống';
  }

  protected resolvedDate(complaint: Complaint): string {
    return complaint.remedy?.decidedAt || complaint.updatedAt;
  }

  protected formatOrderId(id?: string): string {
    if (!id) return '—';
    return '#YC-' + id.slice(-4).toUpperCase();
  }

  private resetDrafts(): void {
    this.activeTab.set('overview');
    this.note.set('');
    this.resolution.set('');
    this.amount.set('');
    this.assigneeId.set(this.selected()?.assignedAdminId || this.session.currentUser()?.id || '');
    this.verificationValid.set(true);
    this.finding.set('shared');
    this.severity.set('medium');
    this.remedyType.set('compensation');
    this.sanctionLevel.set(0);
    this.channels.set(['in_app']);
    this.responseParty.set('complainant');
    this.responseAccepted.set(true);
    this.localError.set(null);
  }
  private startOperation(message: string): void {
    this.localError.set(null);
    this.announcement.set(message);
    this.operationPending.set(true);
  }
  private numberValue(): number | undefined {
    const value = Number(this.amount());
    return this.amount().trim() && Number.isFinite(value) ? value : undefined;
  }
}
