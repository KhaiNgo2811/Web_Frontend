import { Component, computed, inject, input, output, signal } from '@angular/core';

import type {
  Post,
  PostFilter,
  PostSort,
  PostType,
  ServiceCategory,
  User,
} from '../../core/models';
import { ImageSearchService } from '../../core/data/image-search.service';
import { MarketplaceStore } from '../../core/stores';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { PostCard } from '../../shared/post-card/post-card';
import { UiDialog } from '../../shared/ui-dialog/ui-dialog';
import { AcceptOrderDialog } from './accept-order-dialog/accept-order-dialog';
import { PostDetailPanel } from './post-detail-panel/post-detail-panel';

// Chrome/Edge expose SpeechRecognition under a vendor-prefixed name; not in lib.dom.d.ts.
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type FeedType = PostType | 'all';
type FeedCategory = ServiceCategory | 'all';

interface ReportReasonOption {
  value: string;
  label: string;
  icon: string;
}

const REPORT_REASONS: readonly ReportReasonOption[] = [
  { value: 'inappropriate', label: 'Nội dung không phù hợp', icon: 'bi-exclamation-octagon' },
  { value: 'scam', label: 'Lừa đảo, gian lận', icon: 'bi-shield-exclamation' },
  { value: 'unclear-price', label: 'Giá cả không rõ ràng', icon: 'bi-tag' },
  { value: 'unresponsive', label: 'Người dùng không phản hồi', icon: 'bi-chat-square-x' },
  { value: 'other', label: 'Khác', icon: 'bi-three-dots' },
];

const CATEGORY_FILTERS: readonly { value: FeedCategory; icon: string; label: string }[] = [
  { value: 'all', icon: 'bi-lightning-charge-fill', label: 'Tất cả' },
  { value: 'food', icon: 'bi-basket2-fill', label: 'Đi chợ' },
  { value: 'laundry', icon: 'bi-droplet', label: 'Giặt ủi' },
  { value: 'goods', icon: 'bi-box-seam-fill', label: 'Giao nhận' },
  { value: 'repair', icon: 'bi-tools', label: 'Sửa chữa' },
  { value: 'support', icon: 'bi-hand-thumbs-up-fill', label: 'Hỗ trợ' },
  { value: 'other', icon: 'bi-three-dots', label: 'Khác' },
];

@Component({
  selector: 'app-feed',
  imports: [AcceptOrderDialog, EmptyState, PostCard, PostDetailPanel, UiDialog],
  templateUrl: './feed.html',
  styleUrls: ['./feed.scss', './feed-marketplace.scss', './feed-overlays.scss'],
})
export class Feed {
  private readonly marketplace = inject(MarketplaceStore);
  private readonly imageSearch = inject(ImageSearchService);
  private recognition: SpeechRecognitionLike | null = null;

  readonly sourcePosts = input<Post[] | null>(null);
  readonly sourceUsers = input<User[] | null>(null);
  readonly applicationSubmitted = output<{ postId: string; message?: string }>();
  readonly messageRequested = output<string>();
  readonly likeRequested = output<string>();

  protected readonly categories = CATEGORY_FILTERS;
  protected readonly reportReasons = REPORT_REASONS;
  protected readonly reportingPost = signal<Post | null>(null);
  protected readonly reportReason = signal(REPORT_REASONS[0].value);
  protected reportDetails = '';
  protected readonly search = signal('');
  protected readonly selectedType = signal<FeedType>('all');
  protected readonly selectedCategory = signal<FeedCategory>('all');
  protected readonly selectedSort = signal<PostSort>('newest');
  protected readonly selectedPost = signal<Post | null>(null);
  protected readonly pendingPost = signal<Post | null>(null);
  protected readonly successMessage = signal('');
  protected readonly loading = this.marketplace.loading;

  protected readonly voiceSearchSupported = signal(
    typeof window !== 'undefined' &&
      Boolean((window as unknown as Record<string, unknown>)['SpeechRecognition'] ?? (window as unknown as Record<string, unknown>)['webkitSpeechRecognition']),
  );
  protected readonly listening = signal(false);
  protected readonly imageSearching = signal(false);
  protected readonly imageSearchError = signal('');
  protected readonly imageSearchResults = signal<Post[] | null>(null);

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

  protected toggleVoiceSearch(): void {
    if (this.listening()) {
      this.recognition?.stop();
      return;
    }
    const Ctor = ((window as unknown as Record<string, unknown>)['SpeechRecognition'] ??
      (window as unknown as Record<string, unknown>)['webkitSpeechRecognition']) as
      | SpeechRecognitionCtor
      | undefined;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) this.setSearch(transcript);
    };
    recognition.onerror = () => this.listening.set(false);
    recognition.onend = () => this.listening.set(false);

    this.recognition = recognition;
    this.listening.set(true);
    recognition.start();
  }

  protected onImageSearchSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;

    this.imageSearching.set(true);
    this.imageSearchError.set('');
    this.imageSearch.searchByImage(file).subscribe({
      next: (posts) => {
        this.imageSearchResults.set(posts);
        this.imageSearching.set(false);
      },
      error: (error: unknown) => {
        this.imageSearchError.set(
          error instanceof Error ? error.message : 'Không thể tìm kiếm theo ảnh lúc này.',
        );
        this.imageSearching.set(false);
      },
    });
  }

  protected clearImageSearch(): void {
    this.imageSearchResults.set(null);
    this.imageSearchError.set('');
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

  protected openReport(post: Post): void {
    this.reportingPost.set(post);
    this.reportReason.set(REPORT_REASONS[0].value);
    this.reportDetails = '';
  }

  protected closeReport(): void {
    this.reportingPost.set(null);
  }

  protected submitReport(): void {
    this.reportingPost.set(null);
    this.successMessage.set('Đã gửi báo cáo. Cảm ơn bạn đã giúp AntGo an toàn hơn!');
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
