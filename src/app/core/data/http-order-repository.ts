import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CreateReviewInput, Order, OrderTransitionInput, Review } from '../models';
import { toOrder, toReview } from './http-mappers';
import { mapHttpError, mapNotFoundToUndefined, notSupported } from './http-repository.utils';
import { OrderRepository } from './repositories';

interface ListResponse<T> {
  data: T[];
}

const TRANSITION_PATH: Record<OrderTransitionInput['action'], string> = {
  start: 'start',
  report_done: 'report-done',
  confirm_complete: 'confirm',
  cancel: 'cancel',
};

@Injectable()
export class HttpOrderRepository extends OrderRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/orders`;

  listForUser(_userId: string): Observable<Order[]> {
    // Backend scopes /api/orders to the current JWT user — the passed
    // userId is only expected to match the current session's user.
    return this.http.get<ListResponse<Record<string, unknown>>>(this.baseUrl).pipe(
      map(({ data }) => data.map(toOrder)),
      mapHttpError(),
    );
  }

  getById(id: string): Observable<Order | undefined> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/${id}`).pipe(map(toOrder), mapNotFoundToUndefined());
  }

  transition(input: OrderTransitionInput): Observable<Order> {
    const path = TRANSITION_PATH[input.action];
    const body = input.action === 'cancel' ? { reason: input.reason } : {};
    return this.http.post<Record<string, unknown>>(`${this.baseUrl}/${input.orderId}/${path}`, body).pipe(
      map(toOrder),
      mapHttpError(),
    );
  }

  createReview(input: CreateReviewInput): Observable<Review> {
    return this.http
      .post<Record<string, unknown>>(`${this.baseUrl}/${input.orderId}/review`, {
        stars: input.stars,
        comment: input.comment,
      })
      .pipe(map(toReview), mapHttpError());
  }

  listReviews(userId?: string): Observable<Review[]> {
    if (!userId) {
      return notSupported('Xem toàn bộ đánh giá trên hệ thống chưa được antgo-backend hỗ trợ.');
    }
    return this.http.get<ListResponse<Record<string, unknown>>>(`${environment.apiBaseUrl}/users/${userId}/reviews`).pipe(
      map(({ data }) => data.map(toReview)),
      mapHttpError(),
    );
  }
}
