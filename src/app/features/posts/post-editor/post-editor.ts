import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { CreatePostInput, PostType, ServiceCategory } from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

@Component({
  selector: 'app-post-editor',
  imports: [ReactiveFormsModule, RouterLink, UiDialog],
  templateUrl: './post-editor.html',
  styleUrl: './post-editor.scss',
})
export class PostEditor {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(MarketplaceStore);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly dialog = signal<'extend' | 'delete' | null>(null);
  protected readonly categories: { value: ServiceCategory; label: string }[] = [
    { value: 'food', label: 'Ăn uống' }, { value: 'laundry', label: 'Giặt sấy' },
    { value: 'goods', label: 'Mua hộ' }, { value: 'repair', label: 'Sửa chữa' },
    { value: 'support', label: 'Hỗ trợ' }, { value: 'other', label: 'Khác' },
  ];
  protected readonly postId = this.route.snapshot.paramMap.get('id');
  protected readonly type = this.resolveType();
  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(10)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    category: ['food' as ServiceCategory, Validators.required],
    price: [25000, [Validators.required, Validators.min(0)]],
    expectedTime: [''],
    urgency: ['normal' as 'normal' | 'urgent'],
    imageUrl: [''],
  });

  constructor() {
    const existing = this.store.posts().find((post) => post.id === this.postId);
    if (existing) {
      this.form.patchValue({ ...existing, imageUrl: existing.images[0] ?? '' });
    }
  }

  protected submit(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const raw = this.form.getRawValue();
    const input: CreatePostInput = {
      type: this.type, title: raw.title, description: raw.description,
      category: raw.category, price: Number(raw.price), expectedTime: raw.expectedTime || undefined,
      urgency: raw.urgency, images: raw.imageUrl ? [raw.imageUrl] : [],
    };
    if (this.postId) this.store.updatePost(this.postId, input);
    else this.store.createPost(input);
    void this.router.navigateByUrl('/feed');
  }

  protected confirmDialog(): void {
    if (!this.postId) return;
    if (this.dialog() === 'extend') this.store.extendPost(this.postId);
    if (this.dialog() === 'delete') {
      this.store.deletePost(this.postId);
      void this.router.navigateByUrl('/feed');
    }
    this.dialog.set(null);
  }

  private resolveType(): PostType {
    const existing = this.store.posts().find((post) => post.id === this.postId);
    if (existing) return existing.type;
    return this.router.url.includes('/service') ? 'service' : 'request';
  }
}
