import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CreatePostInput, Post, PostFilter, UpdatePostInput } from '../models';
import { toPost, toUser } from './http-mappers';
import { mapHttpError, mapNotFoundToUndefined, notSupported } from './http-repository.utils';
import { PostRepository } from './repositories';

interface PostsPage {
  data: Record<string, unknown>[];
}

@Injectable()
export class HttpPostRepository extends PostRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/posts`;

  list(filter: PostFilter = {}): Observable<Post[]> {
    let params = new HttpParams();
    if (filter.type) params = params.set('type', filter.type);
    if (filter.category) params = params.set('category', filter.category);
    if (filter.regionId) params = params.set('regionId', filter.regionId);
    if (filter.search) params = params.set('search', filter.search);

    return this.http.get<PostsPage>(this.baseUrl, { params }).pipe(
      map(({ data }) => data.map(toPost)),
      // Backend has no server-side urgency/status/sort support — approximate client-side.
      map((posts) => this.applyClientSideFilter(posts, filter)),
      mapHttpError(),
    );
  }

  getById(id: string): Observable<Post | undefined> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/${id}`).pipe(map(toPost), mapNotFoundToUndefined());
  }

  create(authorId: string, input: CreatePostInput): Observable<Post> {
    // Backend requires a regionId the CreatePostInput doesn't carry — default
    // to the author's own region (see CLAUDE.md "Backend" known gaps).
    return this.http.get<Record<string, unknown>>(`${environment.apiBaseUrl}/users/${authorId}`).pipe(
      switchMap((rawAuthor) => {
        const regionId = toUser(rawAuthor).location.regionId;
        return this.http.post<Record<string, unknown>>(this.baseUrl, { ...input, regionId });
      }),
      map(toPost),
      mapHttpError(),
    );
  }

  update(_actorId: string, id: string, input: UpdatePostInput): Observable<Post> {
    return this.http.patch<Record<string, unknown>>(`${this.baseUrl}/${id}`, input).pipe(map(toPost), mapHttpError());
  }

  extend(_actorId: string, _id: string): Observable<Post> {
    return notSupported('Gia hạn ưu tiên bài đăng chưa được antgo-backend hỗ trợ.');
  }

  remove(_actorId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(mapHttpError());
  }

  toggleLike(_userId: string, _id: string): Observable<Post> {
    return notSupported('Thích/bỏ thích bài đăng chưa được antgo-backend hỗ trợ.');
  }

  private applyClientSideFilter(posts: Post[], filter: PostFilter): Post[] {
    const filtered = posts.filter(
      (post) =>
        (!filter.urgency || post.urgency === filter.urgency) &&
        (!filter.status || post.status === filter.status),
    );
    return filtered.sort((left, right) => {
      if (filter.sort === 'price-asc') return left.price - right.price;
      if (filter.sort === 'price-desc') return right.price - left.price;
      if (filter.sort === 'popular') return right.likedBy.length - left.likedBy.length;
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    });
  }
}
