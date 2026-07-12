import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { Post, PostType, User } from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { PostCard } from '../../../shared/post-card/post-card';

type MyPostsTab = PostType | 'all';

const TAB_META: readonly { value: MyPostsTab; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'request', label: 'Yêu cầu' },
  { value: 'service', label: 'Dịch vụ' },
];

@Component({
  selector: 'app-my-posts',
  imports: [RouterLink, EmptyState, PostCard],
  templateUrl: './my-posts.html',
  styleUrl: './my-posts.scss',
})
export class MyPostsPage {
  protected readonly store = inject(MarketplaceStore);
  protected readonly session = inject(SessionStore);

  protected readonly tabs = TAB_META;
  protected readonly selectedTab = signal<MyPostsTab>('all');
  protected readonly showTypeModal = signal(false);

  protected readonly currentUserId = computed(() => this.session.currentUser()?.id ?? 'user-demo');
  protected readonly currentUser = computed(() => this.session.currentUser());

  protected readonly ownPosts = computed(() =>
    this.store.posts().filter((post) => post.authorId === this.currentUserId()),
  );

  protected readonly filteredPosts = computed(() => {
    const tab = this.selectedTab();
    const posts = this.ownPosts();
    if (tab === 'all') return posts;
    return posts.filter((post) => post.type === tab);
  });

  protected readonly requestCount = computed(
    () => this.ownPosts().filter((post) => post.type === 'request').length,
  );

  protected readonly serviceCount = computed(
    () => this.ownPosts().filter((post) => post.type === 'service').length,
  );

  protected chooseTab(tab: MyPostsTab): void {
    this.selectedTab.set(tab);
  }

  protected openTypeModal(): void {
    this.showTypeModal.set(true);
  }

  protected closeTypeModal(): void {
    this.showTypeModal.set(false);
  }

  protected userFor(post: Post): User | undefined {
    const user = this.currentUser();
    return user?.id === post.authorId ? user : undefined;
  }
}
