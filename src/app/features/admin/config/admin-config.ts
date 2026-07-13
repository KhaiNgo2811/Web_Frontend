import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import type {
  AdminAccountInput,
  AdminRole,
  BusinessConfigInput,
  PostBoostTierInput,
  ProviderPromotionPlanInput,
  ProviderPromotionPlanStatus,
  RegionInput,
  ServiceCategoryInput,
  TokenConversionConfig,
  TokenPackage,
  User,
} from '../../../core/models';
import { AdminConfigStore } from '../../../core/stores';
import { adminLabel } from '../shared/admin-labels';
import { AdminConfirmDialog } from '../shared/admin-confirm-dialog/admin-confirm-dialog';
import { AdminDrawer } from '../shared/admin-drawer/admin-drawer';
import { AdminTabs, type AdminTabItem } from '../shared/admin-tabs/admin-tabs';

type ConfigTab = 'pricing' | 'categories' | 'regions' | 'admins' | 'thresholds';
type ConfirmAction = 'discard' | 'restore' | null;

interface ItemConfirm {
  kind: 'remove-category' | 'toggle-region' | 'toggle-admin' | 'remove-boost-tier';
  id: string;
  label: string;
  nextStatus?: 'active' | 'paused' | 'locked';
}

@Component({
  selector: 'app-admin-config',
  imports: [AdminConfirmDialog, AdminDrawer, AdminTabs, DecimalPipe],
  templateUrl: './admin-config.html',
  styleUrl: './admin-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfig implements OnInit {
  protected readonly configStore = inject(AdminConfigStore);
  protected readonly label = adminLabel;

  protected readonly tabs: readonly AdminTabItem[] = [
    { value: 'pricing', label: 'Gói & Giá' },
    { value: 'categories', label: 'Danh mục dịch vụ' },
    { value: 'regions', label: 'Khu vực' },
    { value: 'admins', label: 'Tài khoản quản trị' },
    { value: 'thresholds', label: 'Ngưỡng cảnh báo' },
  ];
  protected readonly activeTab = signal<ConfigTab>('pricing');

  protected readonly adminRoles: AdminRole[] = [
    'support_agent',
    'moderator',
    'complaint_reviewer',
    'super_admin',
  ];

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

  // Danh mục dịch vụ
  protected readonly categoryDrawerOpen = signal(false);
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly categoryDraft = signal<ServiceCategoryInput>(this.emptyCategory());

  // Khu vực
  protected readonly regionDrawerOpen = signal(false);
  protected readonly editingRegionId = signal<string | null>(null);
  protected readonly regionDraft = signal<RegionInput>(this.emptyRegion());

  // Tài khoản quản trị
  protected readonly adminDrawerOpen = signal(false);
  protected readonly editingAdminId = signal<string | null>(null);
  protected readonly adminDraft = signal<AdminAccountInput>(this.emptyAdminAccount());

  // Giá đẩy bài đăng
  protected readonly boostTierDrawerOpen = signal(false);
  protected readonly editingBoostTierId = signal<string | null>(null);
  protected readonly boostTierDraft = signal<PostBoostTierInput>(this.emptyBoostTier());

  // Gói quảng bá hồ sơ nhà cung cấp
  protected readonly promotionPlanDrawerOpen = signal(false);
  protected readonly editingPromotionPlanId = signal<string | null>(null);
  protected readonly promotionPlanDraft = signal<ProviderPromotionPlanInput>(
    this.emptyPromotionPlan(),
  );

  protected readonly itemConfirm = signal<ItemConfirm | null>(null);
  protected readonly itemConfirmRequest = computed(() => {
    const pending = this.itemConfirm();
    if (!pending) return null;
    if (pending.kind === 'remove-category') {
      return {
        title: 'Xóa danh mục dịch vụ?',
        message: `Danh mục "${pending.label}" sẽ bị xóa khỏi hệ thống.`,
        confirmLabel: 'Xóa danh mục',
        cancelLabel: 'Hủy',
        tone: 'danger' as const,
      };
    }
    if (pending.kind === 'remove-boost-tier') {
      return {
        title: 'Xóa mức giá đẩy bài?',
        message: `Mức giá "${pending.label}" sẽ bị xóa khỏi hệ thống.`,
        confirmLabel: 'Xóa mức giá',
        cancelLabel: 'Hủy',
        tone: 'danger' as const,
      };
    }
    const activating = pending.nextStatus === 'active';
    return {
      title: activating ? 'Kích hoạt lại?' : 'Tạm dừng?',
      message: `Xác nhận ${activating ? 'kích hoạt' : 'tạm dừng'} "${pending.label}".`,
      confirmLabel: activating ? 'Kích hoạt' : 'Tạm dừng',
      cancelLabel: 'Hủy',
      tone: activating ? ('default' as const) : ('danger' as const),
    };
  });

  constructor() {
    effect(() => {
      const config = this.configStore.config();
      if (config) {
        const value: BusinessConfigInput = {
          minRatingThreshold: config.minRatingThreshold,
          minComplaintsThreshold: config.minComplaintsThreshold,
          tokenPackages: config.tokenPackages.map((pack) => ({ ...pack })),
          tokenConversion: { ...config.tokenConversion },
        };
        this.baseline.set(value);
        this.form.set(this.clone(value));
      }
    });
  }

  ngOnInit(): void {
    this.configStore.load();
  }

  setTab(tab: string): void {
    this.activeTab.set(tab as ConfigTab);
  }

  updateNumber(
    key: keyof Omit<BusinessConfigInput, 'tokenPackages' | 'tokenConversion'>,
    value: number,
  ): void {
    this.configStore.clearOperationState();
    this.form.update((form) => (form ? { ...form, [key]: value } : form));
  }

  updateTokenConversion(key: keyof TokenConversionConfig, value: number): void {
    this.configStore.clearOperationState();
    this.form.update((form) =>
      form ? { ...form, tokenConversion: { ...form.tokenConversion, [key]: value } } : form,
    );
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
    return event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement
      ? event.target.value
      : '';
  }

  checkedValue(event: Event): boolean {
    return event.target instanceof HTMLInputElement ? event.target.checked : false;
  }

  // --- Danh mục dịch vụ ---
  protected openCategoryDrawer(category?: { id: string } & ServiceCategoryInput): void {
    this.configStore.clearItemState();
    this.editingCategoryId.set(category?.id ?? null);
    this.categoryDraft.set(
      category
        ? {
            key: category.key,
            name: category.name,
            attributesCount: category.attributesCount,
            active: category.active,
          }
        : this.emptyCategory(),
    );
    this.categoryDrawerOpen.set(true);
  }

  protected closeCategoryDrawer(): void {
    this.categoryDrawerOpen.set(false);
  }

  protected updateCategoryDraft(patch: Partial<ServiceCategoryInput>): void {
    this.categoryDraft.update((draft) => ({ ...draft, ...patch }));
  }

  protected saveCategory(): void {
    this.configStore.saveServiceCategory(
      this.categoryDraft(),
      this.editingCategoryId() ?? undefined,
    );
    this.categoryDrawerOpen.set(false);
  }

  protected requestRemoveCategory(id: string, name: string): void {
    this.itemConfirm.set({ kind: 'remove-category', id, label: name });
  }

  // --- Khu vực ---
  protected openRegionDrawer(region?: { id: string } & RegionInput): void {
    this.configStore.clearItemState();
    this.editingRegionId.set(region?.id ?? null);
    this.regionDraft.set(
      region ? { name: region.name, city: region.city, status: region.status } : this.emptyRegion(),
    );
    this.regionDrawerOpen.set(true);
  }

  protected closeRegionDrawer(): void {
    this.regionDrawerOpen.set(false);
  }

  protected updateRegionDraft(patch: Partial<RegionInput>): void {
    this.regionDraft.update((draft) => ({ ...draft, ...patch }));
  }

  protected saveRegion(): void {
    this.configStore.saveRegion(this.regionDraft(), this.editingRegionId() ?? undefined);
    this.regionDrawerOpen.set(false);
  }

  protected requestToggleRegion(
    id: string,
    name: string,
    currentStatus: 'active' | 'paused',
  ): void {
    this.itemConfirm.set({
      kind: 'toggle-region',
      id,
      label: name,
      nextStatus: currentStatus === 'active' ? 'paused' : 'active',
    });
  }

  // --- Tài khoản quản trị ---
  protected openAdminDrawer(account?: User): void {
    this.configStore.clearItemState();
    this.editingAdminId.set(account?.id ?? null);
    this.adminDraft.set(
      account
        ? {
            displayName: account.displayName,
            email: account.email ?? '',
            role: account.role as AdminRole,
          }
        : this.emptyAdminAccount(),
    );
    this.adminDrawerOpen.set(true);
  }

  protected closeAdminDrawer(): void {
    this.adminDrawerOpen.set(false);
  }

  protected updateAdminDraft(patch: Partial<AdminAccountInput>): void {
    this.adminDraft.update((draft) => ({ ...draft, ...patch }));
  }

  protected updateAdminRole(event: Event): void {
    this.updateAdminDraft({ role: this.textValue(event) as AdminRole });
  }

  protected saveAdminAccount(): void {
    this.configStore.saveAdminAccount(this.adminDraft(), this.editingAdminId() ?? undefined);
    this.adminDrawerOpen.set(false);
  }

  protected requestToggleAdmin(id: string, name: string, currentStatus: User['status']): void {
    this.itemConfirm.set({
      kind: 'toggle-admin',
      id,
      label: name,
      nextStatus: currentStatus === 'active' ? 'locked' : 'active',
    });
  }

  protected confirmItemAction(): void {
    const pending = this.itemConfirm();
    this.itemConfirm.set(null);
    if (!pending) return;
    if (pending.kind === 'remove-category') this.configStore.removeServiceCategory(pending.id);
    if (pending.kind === 'remove-boost-tier') this.configStore.removePostBoostTier(pending.id);
    if (pending.kind === 'toggle-region' && pending.nextStatus) {
      this.configStore.setRegionStatus(pending.id, pending.nextStatus as 'active' | 'paused');
    }
    if (pending.kind === 'toggle-admin' && pending.nextStatus) {
      this.configStore.setAdminAccountStatus(pending.id, pending.nextStatus as User['status']);
    }
  }

  // --- Giá đẩy bài đăng ---
  protected openBoostTierDrawer(tier?: { id: string } & PostBoostTierInput): void {
    this.configStore.clearItemState();
    this.editingBoostTierId.set(tier?.id ?? null);
    this.boostTierDraft.set(
      tier
        ? {
            durationDays: tier.durationDays,
            tokenCost: tier.tokenCost,
            vndValue: tier.vndValue,
          }
        : this.emptyBoostTier(),
    );
    this.boostTierDrawerOpen.set(true);
  }

  protected closeBoostTierDrawer(): void {
    this.boostTierDrawerOpen.set(false);
  }

  protected updateBoostTierDraft(patch: Partial<PostBoostTierInput>): void {
    this.boostTierDraft.update((draft) => ({ ...draft, ...patch }));
  }

  protected saveBoostTier(): void {
    this.configStore.savePostBoostTier(this.boostTierDraft(), this.editingBoostTierId() ?? undefined);
    this.boostTierDrawerOpen.set(false);
  }

  protected requestRemoveBoostTier(id: string, label: string): void {
    this.itemConfirm.set({ kind: 'remove-boost-tier', id, label });
  }

  // --- Gói quảng bá hồ sơ nhà cung cấp ---
  protected openPromotionPlanDrawer(
    plan?: { id: string } & ProviderPromotionPlanInput,
  ): void {
    this.configStore.clearItemState();
    this.editingPromotionPlanId.set(plan?.id ?? null);
    this.promotionPlanDraft.set(
      plan
        ? { name: plan.name, pricePerMonth: plan.pricePerMonth, status: plan.status }
        : this.emptyPromotionPlan(),
    );
    this.promotionPlanDrawerOpen.set(true);
  }

  protected closePromotionPlanDrawer(): void {
    this.promotionPlanDrawerOpen.set(false);
  }

  protected updatePromotionPlanDraft(patch: Partial<ProviderPromotionPlanInput>): void {
    this.promotionPlanDraft.update((draft) => ({ ...draft, ...patch }));
  }

  protected savePromotionPlan(): void {
    this.configStore.saveProviderPromotionPlan(
      this.promotionPlanDraft(),
      this.editingPromotionPlanId() ?? undefined,
    );
    this.promotionPlanDrawerOpen.set(false);
  }

  protected togglePromotionPlanStatus(id: string, currentStatus: ProviderPromotionPlanStatus): void {
    this.configStore.setProviderPromotionPlanStatus(
      id,
      currentStatus === 'selling' ? 'stopped' : 'selling',
    );
  }

  protected roleLabel(role: string): string {
    return adminLabel(role);
  }

  private emptyCategory(): ServiceCategoryInput {
    return { key: 'other', name: '', attributesCount: 0, active: true };
  }

  private emptyRegion(): RegionInput {
    return { name: '', city: '', status: 'active' };
  }

  private emptyAdminAccount(): AdminAccountInput {
    return { displayName: '', email: '', role: 'support_agent' };
  }

  private emptyBoostTier(): PostBoostTierInput {
    return { durationDays: 1, tokenCost: 0, vndValue: 0 };
  }

  private emptyPromotionPlan(): ProviderPromotionPlanInput {
    return { name: '', pricePerMonth: 0, status: 'selling' };
  }

  private clone(value: BusinessConfigInput | null): BusinessConfigInput | null {
    return value
      ? {
          ...value,
          tokenPackages: value.tokenPackages.map((pack) => ({ ...pack })),
          tokenConversion: { ...value.tokenConversion },
        }
      : null;
  }
}
