import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import type { BusinessConfigInput, TokenPackage } from '../../../core/models';
import { AdminConfigStore } from '../../../core/stores';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';

type ConfirmAction = 'discard' | 'restore' | null;

@Component({
  selector: 'app-admin-config',
  imports: [AdminConfirmDialog],
  templateUrl: './admin-config.html',
  styleUrl: './admin-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfig implements OnInit {
  protected readonly configStore = inject(AdminConfigStore);
  protected readonly form = signal<BusinessConfigInput | null>(null);
  private readonly baseline = signal<BusinessConfigInput | null>(null);
  protected readonly confirmAction = signal<ConfirmAction>(null);
  protected readonly dirty = computed(
    () => JSON.stringify(this.form()) !== JSON.stringify(this.baseline()),
  );
  protected readonly confirmRequest = computed(() =>
    this.confirmAction() === 'restore'
      ? {
          title: 'Khôi phục cấu hình mặc định?',
          message: 'Tất cả thay đổi cấu hình hiện tại sẽ được thay bằng giá trị mặc định.',
          confirmLabel: 'Khôi phục',
          cancelLabel: 'Hủy',
          tone: 'danger' as const,
        }
      : {
          title: 'Hủy các thay đổi chưa lưu?',
          message: 'Các giá trị vừa chỉnh sửa sẽ không được giữ lại.',
          confirmLabel: 'Hủy thay đổi',
          cancelLabel: 'Tiếp tục chỉnh sửa',
          tone: 'danger' as const,
        },
  );

  constructor() {
    effect(() => {
      const config = this.configStore.config();
      if (config) {
        const value = {
          platformFeePct: config.platformFeePct,
          escrowFeePct: config.escrowFeePct,
          postDurationHours: config.postDurationHours,
          priorityDurationHours: config.priorityDurationHours,
          autoCompleteHours: config.autoCompleteHours,
          minWithdrawalAmount: config.minWithdrawalAmount,
          tokenPackages: config.tokenPackages.map((pack) => ({ ...pack })),
        };
        this.baseline.set(value);
        this.form.set(this.clone(value));
      }
    });
  }

  ngOnInit(): void {
    this.configStore.load();
  }

  updateNumber(key: keyof Omit<BusinessConfigInput, 'tokenPackages'>, value: number): void {
    this.configStore.clearOperationState();
    this.form.update((form) => (form ? { ...form, [key]: value } : form));
  }

  updatePackage(id: string, patch: Partial<TokenPackage>): void {
    this.configStore.clearOperationState();
    this.form.update((form) =>
      form
        ? {
            ...form,
            tokenPackages: form.tokenPackages.map((pack) =>
              pack.id === id ? { ...pack, ...patch } : pack,
            ),
          }
        : form,
    );
  }

  addPackage(): void {
    this.configStore.clearOperationState();
    this.form.update((form) =>
      form
        ? {
            ...form,
            tokenPackages: [
              ...form.tokenPackages,
              {
                id: `token-${Date.now()}`,
                name: 'Gói mới',
                tokens: 10,
                price: 10000,
                bonusPct: 0,
                active: true,
              },
            ],
          }
        : form,
    );
  }

  removePackage(id: string): void {
    this.configStore.clearOperationState();
    this.form.update((form) =>
      form ? { ...form, tokenPackages: form.tokenPackages.filter((pack) => pack.id !== id) } : form,
    );
  }

  save(): void {
    const value = this.form();
    if (!value) return;
    this.configStore.save(value);
  }

  requestConfirm(action: Exclude<ConfirmAction, null>): void {
    this.confirmAction.set(action);
  }

  confirm(): void {
    const action = this.confirmAction();
    this.confirmAction.set(null);
    if (action === 'restore') this.configStore.restoreDefaults();
    if (action === 'discard') this.form.set(this.clone(this.baseline()));
  }

  fieldError(key: keyof BusinessConfigInput): string | undefined {
    return this.configStore.validationErrors()[key];
  }

  numberValue(event: Event): number {
    return event.target instanceof HTMLInputElement ? Number(event.target.value) : 0;
  }

  textValue(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  checkedValue(event: Event): boolean {
    return event.target instanceof HTMLInputElement ? event.target.checked : false;
  }

  private clone(value: BusinessConfigInput | null): BusinessConfigInput | null {
    return value
      ? { ...value, tokenPackages: value.tokenPackages.map((pack) => ({ ...pack })) }
      : null;
  }
}
