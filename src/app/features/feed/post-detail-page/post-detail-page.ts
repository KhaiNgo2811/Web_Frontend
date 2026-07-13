import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { AcceptOrderDialog } from '../accept-order-dialog/accept-order-dialog';
import { PostDetailPanel } from '../post-detail-panel/post-detail-panel';

@Component({
  selector: 'app-post-detail-page',
  imports: [AcceptOrderDialog, EmptyState, PostDetailPanel],
  templateUrl: './post-detail-page.html',
  styleUrl: './post-detail-page.scss',
})
export class PostDetailPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  protected readonly store = inject(MarketplaceStore);
  protected readonly accepting = signal(false);
  protected readonly post = computed(() =>
    this.store.posts().find((item) => item.id === this.route.snapshot.paramMap.get('id')),
  );
  protected readonly author = computed(() =>
    this.store.users().find((user) => user.id === this.post()?.authorId),
  );

  protected apply(message: string): void {
    const post = this.post();
    if (post) this.store.apply({ postId: post.id, message });
    this.accepting.set(false);
    void this.router.navigateByUrl('/orders');
  }
}
