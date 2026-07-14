import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Application, ApplicationSelection, CreateApplicationInput, Order } from '../models';
import { toApplication, toOrder } from './http-mappers';
import { mapHttpError, notSupported } from './http-repository.utils';
import { requireValue } from './local-repository.utils';
import { ApplicationRepository } from './repositories';

interface ListResponse<T> {
  data: T[];
}

@Injectable()
export class HttpApplicationRepository extends ApplicationRepository {
  private readonly http = inject(HttpClient);
  private readonly postsUrl = `${environment.apiBaseUrl}/posts`;
  private readonly applicationsUrl = `${environment.apiBaseUrl}/applications`;

  listForUser(_userId: string): Observable<Application[]> {
    return notSupported('Xem tất cả đề nghị của một người dùng chưa được antgo-backend hỗ trợ.');
  }

  listForPost(postId: string): Observable<Application[]> {
    return this.http.get<ListResponse<Record<string, unknown>>>(`${this.postsUrl}/${postId}/applications`).pipe(
      map(({ data }) => data.map(toApplication)),
      mapHttpError(),
    );
  }

  apply(_applicantId: string, input: CreateApplicationInput): Observable<Application> {
    return this.http
      .post<Record<string, unknown>>(`${this.postsUrl}/${input.postId}/applications`, { message: input.message })
      .pipe(map(toApplication), mapHttpError());
  }

  withdraw(_applicantId: string, id: string): Observable<Application> {
    return this.http.post<Record<string, unknown>>(`${this.applicationsUrl}/${id}/withdraw`, {}).pipe(
      map(toApplication),
      mapHttpError(),
    );
  }

  /**
   * Backend's select response is `{ order, conversation }` with no
   * Application object — follow up with listForPost(order.postId) to find
   * the now-"selected" Application matching `id` (documented gap).
   */
  select(_postAuthorId: string, id: string): Observable<ApplicationSelection> {
    return this.http
      .post<{ order: Record<string, unknown>; conversation: Record<string, unknown> }>(
        `${this.applicationsUrl}/${id}/select`,
        {},
      )
      .pipe(
        switchMap(({ order }) => {
          const mappedOrder: Order = toOrder(order);
          return this.listForPost(mappedOrder.postId).pipe(
            map((applications) => ({
              application: requireValue(
                applications.find((candidate) => candidate.id === id),
                'Không tìm thấy đề nghị vừa được chọn.',
              ),
              order: mappedOrder,
            })),
          );
        }),
        mapHttpError(),
      );
  }
}
