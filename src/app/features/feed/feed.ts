import { Component, computed, inject, input, output, signal } from '@angular/core';

import type {
  Post,
  PostFilter,
  PostSort,
  PostType,
  ServiceCategory,
  User,
} from '../../core/models';
import { MarketplaceStore } from '../../core/stores';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PostCard } from '../../shared/post-card/post-card';
import { AcceptOrderDialog } from './accept-order-dialog/accept-order-dialog';
import { PostDetailPanel } from './post-detail-panel/post-detail-panel';

type FeedType = PostType | 'all';
type FeedCategory = ServiceCategory | 'all';

const CATEGORY_FILTERS: readonly { value: FeedCategory; icon: string; label: string }[] = [
  { value: 'all', icon: '✦', label: 'Tất cả' },
  { value: 'food', icon: '🥕', label: 'Đi chợ' },
  { value: 'laundry', icon: '🧺', label: 'Giặt ủi' },
  { value: 'goods', icon: '📦', label: 'Giao nhận' },
  { value: 'repair', icon: '🛠', label: 'Sửa chữa' },
  { value: 'support', icon: '🤝', label: 'Hỗ trợ' },
  { value: 'other', icon: '✨', label: 'Khác' },
];

@Component({
  selector: 'app-feed',
  imports: [AcceptOrderDialog, EmptyState, PostCard, PostDetailPanel],
  templateUrl: './feed.html',
  styleUrls: ['./feed.scss', './feed-marketplace.scss', './feed-overlays.scss'],
})
export class Feed {
  private readonly marketplace = inject(MarketplaceStore);

  readonly sourcePosts = input<Post[] | null>(null);
  readonly sourceUsers = input<User[] | null>(null);
  readonly applicationSubmitted = output<{ postId: string; message?: string }>();
  readonly messageRequested = output<string>();
  readonly likeRequested = output<string>();

  protected readonly categories = CATEGORY_FILTERS;
  protected readonly search = signal('');
  protected readonly selectedType = signal<FeedType>('all');
  protected readonly selectedCategory = signal<FeedCategory>('all');
  protected readonly selectedSort = signal<PostSort>('newest');
  protected readonly selectedPost = signal<Post | null>(null);
  protected readonly pendingPost = signal<Post | null>(null);
  protected readonly successMessage = signal('');
  protected readonly loading = this.marketplace.loading;

  private readonly posts = computed(() => this.sourcePosts() ?? this.marketplace.posts());
  private readonly users = computed(() => this.sourceUsers() ?? this.marketplace.users());

  private readonly usersById = computed(() => new Map(this.users().map((user) => [user.id, user])));

  protected readonly filteredPosts = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('vi');
    const type = this.selectedType();
    const category = this.selectedCategory();
    const posts = this.posts().filter((post) => {
      const matchesSearch =
        !search || `${post.title} ${post.description}`.toLocaleLowerCase('vi').includes(search);
      return (
        matchesSearch &&
        (type === 'all' || post.type === type) &&
        (category === 'all' || post.category === category)
      );
    });

    return posts.sort((a, b) => {
      if (this.selectedSort() === 'price-asc') return a.price - b.price;
      if (this.selectedSort() === 'price-desc') return b.price - a.price;
      if (this.selectedSort() === 'popular') return b.likedBy.length - a.likedBy.length;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  setSearch(value: string): void {
    this.search.set(value);
    this.syncStoreFilter();
  }

  setType(type: FeedType): void {
    this.selectedType.set(type);
    this.syncStoreFilter();
  }

  setCategory(category: FeedCategory): void {
    this.selectedCategory.set(category);
    this.syncStoreFilter();
  }

  setSort(sort: PostSort): void {
    this.selectedSort.set(sort);
    this.syncStoreFilter();
  }

  applyToPost(postId: string, message = ''): void {
    this.marketplace.apply({ postId, message });
    this.applicationSubmitted.emit({ postId, ...(message ? { message } : {}) });
    this.pendingPost.set(null);
    this.successMessage.set('Đã gửi yêu cầu kết nối. Hãy theo dõi phản hồi trong mục Đơn hàng.');
  }

  protected updateSearch(event: Event): void {
    this.setSearch((event.target as HTMLInputElement).value);
  }

  protected updateSort(event: Event): void {
    this.setSort((event.target as HTMLSelectElement).value as PostSort);
  }

  protected userFor(post: Post | null): User | undefined {
    return post ? this.usersById().get(post.authorId) : undefined;
  }

  protected openDetails(post: Post): void {
    this.selectedPost.set(post);
  }

  protected requestAcceptance(post: Post): void {
    this.selectedPost.set(null);
    this.pendingPost.set(post);
  }

  protected requestMessage(post: Post): void {
    this.messageRequested.emit(post.id);
    this.successMessage.set('Đã mở yêu cầu trò chuyện cho bài đăng này.');
  }

  protected requestLike(post: Post): void {
    this.marketplace.toggleLike(post.id);
    this.likeRequested.emit(post.id);
  }

  protected resetFilters(): void {
    this.search.set('');
    this.selectedType.set('all');
    this.selectedCategory.set('all');
    this.selectedSort.set('newest');
    this.syncStoreFilter();
  }

  private syncStoreFilter(): void {
    if (this.sourcePosts()) return;
    const filter: PostFilter = { status: 'open', sort: this.selectedSort() };
    const search = this.search().trim();
    if (search) filter.search = search;
    if (this.selectedType() !== 'all') filter.type = this.selectedType() as PostType;
    if (this.selectedCategory() !== 'all') {
      filter.category = this.selectedCategory() as ServiceCategory;
    }
    this.marketplace.setFilter(filter);
  }
}
