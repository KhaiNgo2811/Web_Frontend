import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CreatePostInput, Post, PostFilter, UpdatePostInput } from '../models';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';
import { MockDb } from './mock-db';
import { PostRepository } from './repositories';

const POST_DURATION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LocalPostRepository extends PostRepository {
  private readonly db = inject(MockDb);

  list(filter: PostFilter = {}): Observable<Post[]> {
    return asObservable(() => {
      const query = filter.search?.trim().toLocaleLowerCase('vi');
      const posts = this.db.snapshot().posts.filter((post) => {
        const matchesQuery =
          !query ||
          post.title.toLocaleLowerCase('vi').includes(query) ||
          post.description.toLocaleLowerCase('vi').includes(query);
        return (
          matchesQuery &&
          (!filter.type || post.type === filter.type) &&
          (!filter.category || post.category === filter.category) &&
          (!filter.urgency || post.urgency === filter.urgency) &&
          (!filter.regionId || post.regionId === filter.regionId) &&
          (!filter.status || post.status === filter.status)
        );
      });

      return posts.sort((left, right) => this.compare(left, right, filter));
    });
  }

  getById(id: string): Observable<Post | undefined> {
    return asObservable(() => this.db.snapshot().posts.find((post) => post.id === id));
  }

  create(authorId: string, input: CreatePostInput): Observable<Post> {
    return asObservable(() => {
      this.validateInput(input.title, input.description, input.price);
      return this.db.transaction((data) => {
        const author = requireValue(
          data.users.find((user) => user.id === authorId),
          'Không tìm thấy người đăng.',
        );
        const now = nowIso();
        const post: Post = {
          id: createEntityId('post'),
          authorId,
          type: input.type,
          title: input.title.trim(),
          description: input.description.trim(),
          category: input.category,
          price: input.price,
          expectedTime: input.expectedTime,
          images: input.images ?? [],
          status: 'open',
          urgency: input.urgency ?? 'normal',
          likedBy: [],
          isPriority: false,
          regionId: author.location.regionId,
          expiresAt: new Date(Date.now() + POST_DURATION_MS).toISOString(),
          createdAt: now,
          updatedAt: now,
        };
        data.posts.push(post);
        return post;
      });
    });
  }

  update(actorId: string, id: string, input: UpdatePostInput): Observable<Post> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const post = this.editablePost(data.posts, actorId, id);
        this.validateInput(
          input.title ?? post.title,
          input.description ?? post.description,
          input.price ?? post.price,
        );
        Object.assign(post, input, { updatedAt: nowIso() });
        return post;
      }),
    );
  }

  extend(actorId: string, id: string): Observable<Post> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const post = this.editablePost(data.posts, actorId, id);
        const baseline = Math.max(Date.now(), Date.parse(post.expiresAt));
        post.expiresAt = new Date(baseline + POST_DURATION_MS).toISOString();
        post.updatedAt = nowIso();
        return post;
      }),
    );
  }

  remove(actorId: string, id: string): Observable<void> {
    return asObservable(() => {
      this.db.transaction((data) => {
        this.editablePost(data.posts, actorId, id);
        data.posts = data.posts.filter((post) => post.id !== id);
        data.applications = data.applications.filter((application) => application.postId !== id);
      });
    });
  }

  toggleLike(userId: string, id: string): Observable<Post> {
    return asObservable(() =>
      this.db.transaction((data) => {
        requireValue(data.users.find((user) => user.id === userId), 'Không tìm thấy người dùng.');
        const post = requireValue(
          data.posts.find((candidate) => candidate.id === id),
          'Không tìm thấy bài đăng.',
        );
        post.likedBy = post.likedBy.includes(userId)
          ? post.likedBy.filter((candidate) => candidate !== userId)
          : [...post.likedBy, userId];
        return post;
      }),
    );
  }

  private editablePost(posts: Post[], actorId: string, id: string): Post {
    const post = requireValue(
      posts.find((candidate) => candidate.id === id),
      'Không tìm thấy bài đăng.',
    );
    if (post.authorId !== actorId || post.status !== 'open') {
      throw new RepositoryError('Bài đăng không thể chỉnh sửa.');
    }
    return post;
  }

  private validateInput(title: string, description: string, price: number): void {
    if (title.trim().length < 10 || description.trim().length < 20 || price < 0) {
      throw new RepositoryError('Nội dung bài đăng chưa hợp lệ.');
    }
  }

  private compare(left: Post, right: Post, filter: PostFilter): number {
    if (filter.sort === 'price-asc') return left.price - right.price;
    if (filter.sort === 'price-desc') return right.price - left.price;
    if (filter.sort === 'popular') return right.likedBy.length - left.likedBy.length;
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  }
}

