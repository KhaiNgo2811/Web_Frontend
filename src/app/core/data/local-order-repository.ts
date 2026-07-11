import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { CreateReviewInput, Order, OrderTransitionInput, Review } from '../models';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';
import { applyOrderTransition } from './local-order-rules';
import { MockDb } from './mock-db';
import { createNotification } from './notification.factory';
import { OrderRepository } from './repositories';

@Injectable()
export class LocalOrderRepository extends OrderRepository {
  private readonly db = inject(MockDb);

  listForUser(userId: string): Observable<Order[]> {
    return asObservable(() =>
      this.db
        .snapshot()
        .orders.filter((order) => [order.customerId, order.providerId].includes(userId))
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    );
  }

  getById(id: string): Observable<Order | undefined> {
    return asObservable(() => this.db.snapshot().orders.find((order) => order.id === id));
  }

  transition(input: OrderTransitionInput): Observable<Order> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const order = requireValue(
          data.orders.find((candidate) => candidate.id === input.orderId),
          'Không tìm thấy đơn hàng.',
        );
        const event = applyOrderTransition(order, input);
        order.updatedAt = nowIso();
        data.notifications.push(
          createNotification({
            userId: event.recipientId,
            type: event.type,
            title: event.title,
            body: event.body,
            route: `/orders/${order.id}`,
            orderId: order.id,
          }),
        );
        return order;
      }),
    );
  }

  createReview(input: CreateReviewInput): Observable<Review> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const order = requireValue(
          data.orders.find((candidate) => candidate.id === input.orderId),
          'Không tìm thấy đơn hàng.',
        );
        if (
          order.status !== 'completed' ||
          ![order.customerId, order.providerId].includes(input.actorId)
        ) {
          throw new RepositoryError('Đơn hàng chưa thể đánh giá.');
        }
        if (input.stars < 1 || input.stars > 5) {
          throw new RepositoryError('Số sao phải từ 1 đến 5.');
        }
        if (
          data.reviews.some(
            (review) => review.orderId === order.id && review.raterId === input.actorId,
          )
        ) {
          throw new RepositoryError('Bạn đã đánh giá đơn hàng này.');
        }

        const rateeId = input.actorId === order.customerId ? order.providerId : order.customerId;
        const review: Review = {
          id: createEntityId('review'),
          orderId: order.id,
          raterId: input.actorId,
          rateeId,
          stars: input.stars,
          comment: input.comment?.trim(),
          hidden: false,
          createdAt: nowIso(),
        };
        data.reviews.push(review);
        data.notifications.push(
          createNotification({
            userId: rateeId,
            type: 'review_received',
            title: 'Bạn nhận được đánh giá mới',
            body: `Bạn nhận được ${review.stars} sao cho đơn ${order.code}.`,
            route: `/orders/${order.id}`,
            orderId: order.id,
          }),
        );
        return review;
      }),
    );
  }

  listReviews(userId?: string): Observable<Review[]> {
    return asObservable(() => {
      const reviews = this.db.snapshot().reviews;
      return userId
        ? reviews.filter(
            (review) => !review.hidden && (review.raterId === userId || review.rateeId === userId),
          )
        : reviews.filter((review) => !review.hidden);
    });
  }
}
