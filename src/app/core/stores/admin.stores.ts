import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  AdminDashboardSummary,
  AdminOperationState,
  AdminUserDetail,
  AdminUserFilter,
  BusinessConfig,
  BusinessConfigInput,
  BusinessConfigValidationErrors,
  Complaint,
  ComplaintAppealInput,
  ComplaintAssessmentInput,
  ComplaintAssignInput,
  ComplaintEvidenceRequestInput,
  ComplaintFilter,
  ComplaintNotifyInput,
  ComplaintPartyResponseInput,
  ComplaintResolutionInput,
  ComplaintVerificationInput,
  ModerationAction,
  ModerationFilter,
  ModerationReport,
  Region,
  User,
} from '../models';
import {
  AdminUserRepository,
  ComplaintRepository,
  ConfigRepository,
  ModerationRepository,
} from '../data';
import { SessionStore } from './session.store';

@Injectable({ providedIn: 'root' })
export class AdminDashboardStore {
  private readonly repository = inject(AdminUserRepository);
  private readonly session = inject(SessionStore);
  private readonly summaryState = signal<AdminDashboardSummary | null>(null);
  private readonly rangeDaysState = signal<7 | 30 | 90>(30);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly operationState = signal<AdminOperationState>({ status: 'idle' });
  private pendingOperations = 0;

  readonly summary = this.summaryState.asReadonly();
  readonly rangeDays = this.rangeDaysState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly operation = this.operationState.asReadonly();

  load(rangeDays = this.rangeDaysState()): void {
    this.rangeDaysState.set(this.asRangeDays(rangeDays));
    this.run(
      this.repository.getDashboardSummary(this.actorId(), this.rangeDaysState()),
      (summary) => this.summaryState.set(summary),
    );
  }

  setRange(rangeDays: 7 | 30 | 90): void {
    this.load(rangeDays);
  }

  private asRangeDays(value: unknown): 7 | 30 | 90 {
    return value === 7 || value === 30 || value === 90 ? value : 30;
  }

  private actorId(): string {
    return this.session.currentUser()?.id ?? '';
  }

  private run<T>(source: Observable<T>, next: (value: T) => void): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
    this.operationState.set({ status: 'loading', message: 'Đang tải dữ liệu tổng quan.' });
    this.errorState.set(null);
    source.subscribe({
      next: (value) => {
        next(value);
        this.operationState.set({ status: 'success', message: 'Dữ liệu tổng quan đã sẵn sàng.' });
      },
      error: (error: unknown) => this.fail(error),
      complete: () => this.finish(),
    });
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
    this.errorState.set(message);
    this.operationState.set({ status: 'error', message });
    this.finish();
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminUsersStore {
  private readonly repository = inject(AdminUserRepository);
  private readonly session = inject(SessionStore);
  private readonly usersState = signal<User[]>([]);
  private readonly selectedUserIdState = signal<string | null>(null);
  private readonly selectedUserState = signal<AdminUserDetail | null>(null);
  private readonly filterState = signal<AdminUserFilter>({
    status: 'all',
    role: 'all',
    sort: 'newest',
  });
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly operationState = signal<AdminOperationState>({ status: 'idle' });
  private pendingOperations = 0;
  private listRequest = 0;
  private detailRequest = 0;

  readonly users = this.usersState.asReadonly();
  readonly selectedUserId = this.selectedUserIdState.asReadonly();
  readonly selectedUser = this.selectedUserState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly operation = this.operationState.asReadonly();
  readonly currentAdminId = computed(() => this.session.currentUser()?.id ?? '');

  load(): void {
    const request = ++this.listRequest;
    this.run(this.repository.list(this.currentAdminId(), this.filterState()), (users) => {
      if (request !== this.listRequest) return;
      this.usersState.set(users);
      const selectedId = this.selectedUserIdState();
      if (selectedId && users.some((user) => user.id === selectedId)) this.select(selectedId);
    });
  }

  setFilter(partial: Partial<AdminUserFilter>): void {
    this.filterState.update((filter) => ({ ...filter, ...partial }));
    this.load();
  }

  select(id: string | null): void {
    const request = ++this.detailRequest;
    this.selectedUserIdState.set(id);
    if (!id) {
      this.selectedUserState.set(null);
      return;
    }
    this.run(this.repository.getById(this.currentAdminId(), id), (user) => {
      if (request === this.detailRequest) this.selectedUserState.set(user ?? null);
    });
  }

  lock(id: string, reason?: string): void {
    this.setStatus(id, 'locked', reason);
  }

  unlock(id: string, reason?: string): void {
    this.setStatus(id, 'active', reason);
  }

  clearError(): void {
    this.errorState.set(null);
  }

  private setStatus(id: string, status: 'active' | 'locked', reason?: string): void {
    const adminId = this.currentAdminId();
    this.operationState.set({ status: 'loading', message: 'Đang cập nhật trạng thái tài khoản.' });
    this.run(this.repository.setStatus({ adminId, userId: id, status, reason }), () => {
      this.load();
      this.select(id);
      this.session.refreshUser();
      this.operationState.set({
        status: 'success',
        message: status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.',
      });
    });
  }

  private run<T>(source: Observable<T>, next: (value: T) => void): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next,
      error: (error: unknown) => this.fail(error),
      complete: () => this.finish(),
    });
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
    this.errorState.set(message);
    this.operationState.set({ status: 'error', message });
    this.finish();
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminModerationStore {
  private readonly repository = inject(ModerationRepository);
  private readonly session = inject(SessionStore);
  private readonly reportsState = signal<ModerationReport[]>([]);
  private readonly selectedReportIdState = signal<string | null>(null);
  private readonly selectedReportState = signal<ModerationReport | null>(null);
  private readonly filterState = signal<ModerationFilter>({ status: 'all', targetType: 'all' });
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly operationState = signal<AdminOperationState>({ status: 'idle' });
  private pendingOperations = 0;
  private listRequest = 0;
  private detailRequest = 0;

  readonly reports = this.reportsState.asReadonly();
  readonly selectedReportId = this.selectedReportIdState.asReadonly();
  readonly selectedReport = this.selectedReportState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly operation = this.operationState.asReadonly();

  load(selectedId = this.selectedReportIdState()): void {
    const request = ++this.listRequest;
    this.selectedReportIdState.set(selectedId);
    this.run(this.repository.list(this.adminId(), this.filterState()), (reports) => {
      if (request !== this.listRequest) return;
      this.reportsState.set(reports);
      this.loadSelected(this.selectedReportIdState());
    });
  }

  setFilter(partial: Partial<ModerationFilter>): void {
    this.filterState.update((filter) => ({ ...filter, ...partial }));
    this.load();
  }

  act(reportId: string, action: ModerationAction, note?: string): void {
    const adminId = this.session.currentUser()?.id ?? '';
    this.operationState.set({ status: 'loading', message: 'Đang xử lý báo cáo.' });
    this.run(this.repository.act({ adminId, reportId, action, note }), () => {
      this.load(reportId);
      this.operationState.set({ status: 'success', message: 'Đã cập nhật báo cáo.' });
    });
  }

  select(id: string | null): void {
    this.selectedReportIdState.set(id);
    this.loadSelected(id);
  }

  private loadSelected(id: string | null): void {
    const request = ++this.detailRequest;
    if (!id) {
      this.selectedReportState.set(null);
      this.errorState.set(null);
      return;
    }
    this.run(this.repository.getById(this.adminId(), id), (report) => {
      if (request !== this.detailRequest) return;
      this.selectedReportState.set(report ?? null);
      if (!report) this.errorState.set('Không tìm thấy báo cáo.');
    });
  }

  private run<T>(source: Observable<T>, next: (value: T) => void): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next,
      error: (error: unknown) => this.fail(error),
      complete: () => this.finish(),
    });
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
    this.errorState.set(message);
    this.operationState.set({ status: 'error', message });
    this.finish();
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }

  private adminId(): string {
    return this.session.currentUser()?.id ?? '';
  }
}

@Injectable({ providedIn: 'root' })
export class AdminComplaintsStore {
  private readonly repository = inject(ComplaintRepository);
  private readonly session = inject(SessionStore);
  private readonly complaintsState = signal<Complaint[]>([]);
  private readonly selectedComplaintIdState = signal<string | null>(null);
  private readonly selectedComplaintState = signal<Complaint | null>(null);
  private readonly filterState = signal<ComplaintFilter>({ stage: 'all', priority: 'all' });
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly operationState = signal<AdminOperationState>({ status: 'idle' });
  private pendingOperations = 0;
  private listRequest = 0;
  private detailRequest = 0;

  readonly complaints = this.complaintsState.asReadonly();
  readonly selectedComplaintId = this.selectedComplaintIdState.asReadonly();
  readonly selectedComplaint = this.selectedComplaintState.asReadonly();
  readonly filter = this.filterState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly operation = this.operationState.asReadonly();

  load(selectedId = this.selectedComplaintIdState()): void {
    const request = ++this.listRequest;
    this.selectedComplaintIdState.set(selectedId);
    this.run(this.repository.list(this.adminId(), this.filterState()), (complaints) => {
      if (request !== this.listRequest) return;
      this.complaintsState.set(complaints);
      this.loadSelected(this.selectedComplaintIdState());
    });
  }

  setFilter(partial: Partial<ComplaintFilter>): void {
    this.filterState.update((filter) => ({ ...filter, ...partial }));
    this.load();
  }

  select(id: string | null): void {
    this.selectedComplaintIdState.set(id);
    this.loadSelected(id);
  }

  private loadSelected(id: string | null): void {
    const request = ++this.detailRequest;
    if (!id) {
      this.selectedComplaintState.set(null);
      this.errorState.set(null);
      return;
    }
    this.run(this.repository.getById(this.adminId(), id), (complaint) => {
      if (request !== this.detailRequest) return;
      this.selectedComplaintState.set(complaint ?? null);
      if (!complaint) this.errorState.set('Không tìm thấy khiếu nại.');
    });
  }

  assign(input: Omit<ComplaintAssignInput, 'adminId'>): void {
    const adminId = this.session.currentUser()?.id ?? '';
    this.mutate(input.complaintId, this.repository.assign({ ...input, adminId }));
  }

  recordVerification(input: Omit<ComplaintVerificationInput, 'adminId'>): void {
    this.mutate(
      input.complaintId,
      this.repository.recordVerification({ ...input, adminId: this.adminId() }),
    );
  }

  requestEvidence(input: Omit<ComplaintEvidenceRequestInput, 'adminId'>): void {
    this.mutate(
      input.complaintId,
      this.repository.requestEvidence({ ...input, adminId: this.adminId() }),
    );
  }

  recordAssessment(input: Omit<ComplaintAssessmentInput, 'adminId'>): void {
    this.mutate(
      input.complaintId,
      this.repository.recordAssessment({ ...input, adminId: this.adminId() }),
    );
  }

  decideResolution(input: Omit<ComplaintResolutionInput, 'adminId'>): void {
    this.mutate(
      input.complaintId,
      this.repository.decideResolution({ ...input, adminId: this.adminId() }),
    );
  }

  notifyParties(input: Omit<ComplaintNotifyInput, 'adminId'>): void {
    this.mutate(
      input.complaintId,
      this.repository.notifyParties({ ...input, adminId: this.adminId() }),
    );
  }

  recordPartyResponse(input: Omit<ComplaintPartyResponseInput, 'adminId'>): void {
    this.mutate(
      input.complaintId,
      this.repository.recordPartyResponse({ ...input, adminId: this.adminId() }),
    );
  }

  appeal(input: Omit<ComplaintAppealInput, 'adminId' | 'reviewerId'>): void {
    const reviewerId = this.adminId();
    this.mutate(
      input.complaintId,
      this.repository.appeal({ ...input, adminId: reviewerId, reviewerId }),
    );
  }

  close(input: Omit<ComplaintResolutionInput, 'adminId'>): void {
    this.mutate(input.complaintId, this.repository.close({ ...input, adminId: this.adminId() }));
  }

  private mutate(id: string, source: Observable<Complaint>): void {
    this.operationState.set({ status: 'loading', message: 'Đang cập nhật hồ sơ khiếu nại.' });
    this.run(source, () => {
      this.load(id);
      this.operationState.set({ status: 'success', message: 'Đã cập nhật hồ sơ khiếu nại.' });
    });
  }

  private adminId(): string {
    return this.session.currentUser()?.id ?? '';
  }

  private run<T>(source: Observable<T>, next: (value: T) => void): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next,
      error: (error: unknown) => this.fail(error),
      complete: () => this.finish(),
    });
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra.';
    this.errorState.set(message);
    this.operationState.set({ status: 'error', message });
    this.finish();
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminConfigStore {
  private readonly repository = inject(ConfigRepository);
  private readonly session = inject(SessionStore);
  private readonly regionsState = signal<Region[]>([]);
  private readonly configState = signal<BusinessConfig | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly validationErrorsState = signal<BusinessConfigValidationErrors>({});
  private readonly saveStateSignal = signal<'idle' | 'pending' | 'success' | 'error'>('idle');
  private readonly restoreStateSignal = signal<'idle' | 'pending' | 'success' | 'error'>('idle');
  private pendingOperations = 0;

  readonly regions = this.regionsState.asReadonly();
  readonly config = this.configState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly validationErrors = this.validationErrorsState.asReadonly();
  readonly saveState = this.saveStateSignal.asReadonly();
  readonly restoreState = this.restoreStateSignal.asReadonly();

  load(): void {
    const actorId = this.session.currentUser()?.id ?? '';
    this.run(this.repository.listRegions(actorId), (regions) => this.regionsState.set(regions));
    this.run(this.repository.getBusinessConfig(actorId), (config) => this.configState.set(config));
  }

  save(input: BusinessConfigInput): boolean {
    const errors = this.repository.validateBusinessConfig(input);
    this.validationErrorsState.set(errors);
    this.saveStateSignal.set(Object.keys(errors).length ? 'error' : 'pending');
    if (Object.keys(errors).length) return false;
    const adminId = this.session.currentUser()?.id ?? '';
    this.run(
      this.repository.saveBusinessConfig(adminId, input),
      (config) => this.configState.set(config),
      () => this.saveStateSignal.set('error'),
      () => this.saveStateSignal.set('success'),
    );
    return true;
  }

  restoreDefaults(): void {
    const adminId = this.session.currentUser()?.id ?? '';
    this.restoreStateSignal.set('pending');
    this.run(
      this.repository.restoreDefaults(adminId),
      (config) => this.configState.set(config),
      () => this.restoreStateSignal.set('error'),
      () => this.restoreStateSignal.set('success'),
    );
  }

  clearOperationState(): void {
    this.saveStateSignal.set('idle');
    this.restoreStateSignal.set('idle');
    this.validationErrorsState.set({});
  }

  private run<T>(
    source: Observable<T>,
    next: (value: T) => void,
    onError?: () => void,
    onComplete?: () => void,
  ): void {
    this.pendingOperations += 1;
    this.loadingState.set(true);
    this.errorState.set(null);
    source.subscribe({
      next,
      error: (error: unknown) => {
        onError?.();
        this.fail(error);
      },
      complete: () => {
        onComplete?.();
        this.finish();
      },
    });
  }

  private fail(error: unknown): void {
    this.errorState.set(error instanceof Error ? error.message : 'Đã có lỗi xảy ra.');
    this.finish();
  }

  private finish(): void {
    this.pendingOperations = Math.max(0, this.pendingOperations - 1);
    this.loadingState.set(this.pendingOperations > 0);
  }
}
