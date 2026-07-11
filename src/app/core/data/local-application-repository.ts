import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { Application, ApplicationSelection, CreateApplicationInput, Order } from '../models';
import {
  asObservable,
  createEntityId,
  nowIso,
  RepositoryError,
  requireValue,
} from './local-repository.utils';
import { MockDb } from './mock-db';
import { createNotification } from './notification.factory';
import { ApplicationRepository } from './repositories';

@Injectable()
export class LocalApplicationRepository extends ApplicationRepository {
  private readonly db = inject(MockDb);

  listForUser(userId: string): Observable<Application[]> {
    return asObservable(() => {
      const data = this.db.snapshot();
      const authoredPostIds = new Set(
        data.posts.filter((post) => post.authorId === userId).map((post) => post.id),
      );
      return data.applications
        .filter(
          (application) =>
            application.applicantId === userId || authoredPostIds.has(application.postId),
        )
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    });
  }

  listForPost(postId: string): Observable<Application[]> {
    return asObservable(() =>
      this.db
        .snapshot()
        .applications.filter((application) => application.postId === postId)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
    );
  }

  apply(applicantId: string, input: CreateApplicationInput): Observable<Application> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const post = requireValue(
          data.posts.find((candidate) => candidate.id === input.postId),
          'Không tìm thấy bài đăng.',
        );
        requireValue(
          data.users.find((user) => user.id === applicantId),
          'Không tìm thấy người dùng.',
        );
        if (post.status !== 'open' || post.authorId === applicantId) {
          throw new RepositoryError('Không thể nhận bài đăng này.');
        }
        const duplicate = data.applications.some(
          (application) =>
            application.postId === post.id &&
            application.applicantId === applicantId &&
            ['pending', 'selected'].includes(application.status),
        );
        if (duplicate) {
          throw new RepositoryError('Bạn đã gửi đề nghị cho bài đăng này.');
        }

        const now = nowIso();
        const application: Application = {
          id: createEntityId('application'),
          postId: post.id,
          applicantId,
          message: input.message.trim(),
          proposedPrice: input.proposedPrice,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };
        if (!application.message) {
          throw new RepositoryError('Vui lòng nhập lời nhắn.');
        }
        data.applications.push(application);
        data.notifications.push(
          createNotification({
            userId: post.authorId,
            type: 'application_received',
            title: 'Có người muốn nhận việc',
            body: `Bạn nhận được đề nghị mới cho “${post.title}”.`,
            route: '/orders',
          }),
        );
        return application;
      }),
    );
  }

  withdraw(applicantId: string, id: string): Observable<Application> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const application = requireValue(
          data.applications.find((candidate) => candidate.id === id),
          'Không tìm thấy đề nghị.',
        );
        if (application.applicantId !== applicantId || application.status !== 'pending') {
          throw new RepositoryError('Đề nghị không thể thu hồi.');
        }
        application.status = 'withdrawn';
        application.updatedAt = nowIso();
        return application;
      }),
    );
  }

  select(postAuthorId: string, id: string): Observable<ApplicationSelection> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const application = requireValue(
          data.applications.find((candidate) => candidate.id === id),
          'Không tìm thấy đề nghị.',
        );
        const post = requireValue(
          data.posts.find((candidate) => candidate.id === application.postId),
          'Không tìm thấy bài đăng.',
        );
        if (
          post.authorId !== postAuthorId ||
          post.status !== 'open' ||
          application.status !== 'pending'
        ) {
          throw new RepositoryError('Đề nghị không thể được chọn.');
        }

        const now = nowIso();
        application.status = 'selected';
        application.updatedAt = now;
        data.applications
          .filter((candidate) => candidate.postId === post.id && candidate.id !== id)
          .forEach((candidate) => {
            if (candidate.status === 'pending') {
              candidate.status = 'rejected';
              candidate.updatedAt = now;
            }
          });
        post.status = 'connected';
        post.updatedAt = now;

        const authorIsCustomer = post.type === 'request';
        const order: Order = {
          id: createEntityId('order'),
          code: `AG-${String(125 + data.orders.length).padStart(6, '0')}`,
          postId: post.id,
          applicationId: application.id,
          customerId: authorIsCustomer ? post.authorId : application.applicantId,
          providerId: authorIsCustomer ? application.applicantId : post.authorId,
          status: 'pending',
          statusHistory: [{ status: 'pending', at: now, byUserId: postAuthorId }],
          escrowState: 'none',
          createdAt: now,
          updatedAt: now,
        };
        data.orders.push(order);
        data.conversations.push({
          id: createEntityId('conversation'),
          postId: post.id,
          orderId: order.id,
          participantIds: [post.authorId, application.applicantId],
          createdAt: now,
          updatedAt: now,
        });
        data.notifications.push(
          createNotification({
            userId: application.applicantId,
            type: 'application_selected',
            title: 'Đề nghị đã được chọn',
            body: `Bạn đã được chọn cho “${post.title}”.`,
            route: `/orders/${order.id}`,
            orderId: order.id,
          }),
        );
        return { application, order };
      }),
    );
  }
}
