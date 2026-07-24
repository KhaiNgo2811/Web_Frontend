import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import type {
  Application,
  CreatePostInput,
  Post,
  PostType,
  ServiceCategory,
} from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

type MyPostsTab = PostType | 'all';
type FormMode = 'create' | 'edit' | null;

const TAB_META: readonly { value: MyPostsTab; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'request', label: 'Cần giúp' },
  { value: 'service', label: 'Cung cấp' },
];

const CATEGORY_OPTIONS: readonly { value: ServiceCategory; label: string }[] = [
  { value: 'food', label: 'Đi chợ & ăn uống' },
  { value: 'laundry', label: 'Giặt ủi' },
  { value: 'goods', label: 'Giao nhận đồ' },
  { value: 'repair', label: 'Sửa chữa' },
  { value: 'support', label: 'Hỗ trợ' },
  { value: 'other', label: 'Khác' },
];

// Matches antgo-backend's seeded regions (khu-a/khu-b/khu-c — see seed.ts).
const REGION_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'khu-a', label: 'KTX Khu A' },
  { value: 'khu-b', label: 'KTX Khu B' },
  { value: 'khu-c', label: 'KTX Khu C' },
];

// Flags obvious keyboard-mashing/spam: a run of the same character, a short
// chunk repeated back-to-back, or very low character diversity over a long string.
function looksLikeSpam(value: string): boolean {
  const normalized = value.trim().toLocaleLowerCase('vi');
  if (!normalized) return false;
  if (/(.)\1{3,}/.test(normalized)) return true;
  if (/(.{2,6})\1{2,}/.test(normalized)) return true;
  const letters = normalized.replace(/[^\p{L}]/gu, '');
  return letters.length >= 12 && new Set(letters).size / letters.length < 0.35;
}

function spamValidator(control: AbstractControl): ValidationErrors | null {
  return looksLikeSpam((control.value as string | null) ?? '') ? { spam: true } : null;
}

const STATUS_META: Record<Post['status'], { label: string; tone: string }> = {
  open: { label: 'Đang mở', tone: 'open' },
  connected: { label: 'Đã có người nhận', tone: 'connected' },
  closed: { label: 'Đã đóng', tone: 'closed' },
  expired: { label: 'Hết hạn', tone: 'closed' },
};

const THUMB_TONES = ['thumb--peach', 'thumb--sky', 'thumb--mint', 'thumb--lilac'];

const MAX_IMAGES = 5;

@Component({
  selector: 'app-my-posts',
  imports: [ReactiveFormsModule, EmptyState, UiDialog],
  templateUrl: './my-posts.html',
  styleUrl: './my-posts.scss',
})
export class MyPostsPage implements OnInit {
  private readonly store = inject(MarketplaceStore);
  private readonly session = inject(SessionStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly tabs = TAB_META;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly regions = REGION_OPTIONS;
  protected readonly selectedTab = signal<MyPostsTab>('all');
  protected readonly showTypeModal = signal(false);
  protected readonly formMode = signal<FormMode>(null);
  protected readonly formType = signal<PostType>('request');
  protected readonly editingPost = signal<Post | null>(null);
  protected readonly deleteTarget = signal<Post | null>(null);
  protected readonly images = signal<string[]>([]);
  protected readonly maxImages = MAX_IMAGES;

  protected readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(20), spamValidator]],
    category: ['food' as ServiceCategory],
    price: [null as number | null, [Validators.required, Validators.min(1)]],
    expectedTime: [''],
    regionId: ['', Validators.required],
  });

  protected readonly formError = this.store.error;

  protected readonly currentUserId = computed(() => this.session.currentUser()?.id ?? 'user-demo');

  protected readonly ownPosts = computed(() =>
    this.store.posts().filter((post) => post.authorId === this.currentUserId()),
  );

  protected readonly filteredPosts = computed(() => {
    const tab = this.selectedTab();
    const posts = this.ownPosts();
    return tab === 'all' ? posts : posts.filter((post) => post.type === tab);
  });

  protected readonly applicationsByPost = computed(() => {
    const map = new Map<string, Application[]>();
    for (const application of this.store.applications()) {
      const list = map.get(application.postId) ?? [];
      list.push(application);
      map.set(application.postId, list);
    }
    return map;
  });

  ngOnInit(): void {
    // The marketplace-wide filter is shared with Feed's browse tabs — if the
    // user last filtered Feed by type/category/status, that filter otherwise
    // stays applied here too and hides own posts of the other type after
    // creating them. Reset it so every own post (any type/category/status) loads.
    this.store.setFilter({ sort: 'newest' });
  }

  protected chooseTab(tab: MyPostsTab): void {
    this.selectedTab.set(tab);
  }

  protected openTypeModal(): void {
    this.showTypeModal.set(true);
  }

  protected closeTypeModal(): void {
    this.showTypeModal.set(false);
  }

  protected openCreateForm(type: PostType): void {
    this.formMode.set('create');
    this.formType.set(type);
    this.editingPost.set(null);
    this.images.set([]);
    this.form.reset({
      title: '',
      description: '',
      category: 'food',
      price: null,
      expectedTime: '',
      regionId: this.session.currentUser()?.location.regionId ?? this.regions[0].value,
    });
    this.showTypeModal.set(false);
  }

  protected openEditForm(post: Post): void {
    this.formMode.set('edit');
    this.formType.set(post.type);
    this.editingPost.set(post);
    this.images.set([...post.images]);
    this.form.reset({
      title: post.title,
      description: post.description,
      category: post.category,
      price: post.price,
      expectedTime: post.expectedTime ?? '',
      regionId: post.regionId,
    });
  }

  protected closeFormModal(): void {
    this.formMode.set(null);
  }

  protected onPickImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, this.maxImages - this.images().length);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          this.images.update((list) => [...list, reader.result as string].slice(0, this.maxImages));
        }
      };
      reader.readAsDataURL(file);
    }
    input.value = '';
  }

  protected removeImage(index: number): void {
    this.images.update((list) => list.filter((_, i) => i !== index));
  }

  protected submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input: CreatePostInput = {
      type: this.formType(),
      title: raw.title ?? '',
      description: raw.description ?? '',
      category: (raw.category ?? 'food') as ServiceCategory,
      price: Number(raw.price ?? 0),
      expectedTime: raw.expectedTime || undefined,
      images: this.images(),
      regionId: raw.regionId || undefined,
    };
    const editing = this.editingPost();
    if (this.formMode() === 'edit' && editing) this.store.updatePost(editing.id, input);
    else this.store.createPost(input);
    if (this.store.error()) return;
    this.closeFormModal();
  }

  protected openDeleteConfirm(post: Post): void {
    this.deleteTarget.set(post);
  }

  protected closeDeleteConfirm(): void {
    this.deleteTarget.set(null);
  }

  protected confirmDelete(): void {
    const post = this.deleteTarget();
    if (post) this.store.deletePost(post.id);
    this.deleteTarget.set(null);
  }

  protected typeBadgeLabel(post: Post): string {
    return post.type === 'request' ? 'Yêu cầu' : 'Dịch vụ';
  }

  protected statusLabel(post: Post): string {
    return STATUS_META[post.status].label;
  }

  protected statusTone(post: Post): string {
    return STATUS_META[post.status].tone;
  }

  protected thumbTone(index: number): string {
    return THUMB_TONES[index % THUMB_TONES.length];
  }

  protected totalApplicants(postId: string): number {
    return (this.applicationsByPost().get(postId) ?? []).length;
  }

  protected pendingApplicants(postId: string): number {
    return (this.applicationsByPost().get(postId) ?? []).filter((a) => a.status === 'pending')
      .length;
  }

  protected timeLabel(post: Post): string {
    const elapsed = Math.max(0, Date.now() - new Date(post.createdAt).getTime());
    const hours = Math.floor(elapsed / 3_600_000);
    if (hours < 1) return 'Vừa đăng';
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Hôm qua' : `${days} ngày trước`;
  }
}
