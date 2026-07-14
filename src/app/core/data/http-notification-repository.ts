import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { Notification } from '../models';
import { toNotification } from './http-mappers';
import { mapHttpError } from './http-repository.utils';
import { NotificationRepository } from './repositories';

interface ListResponse<T> {
  data: T[];
}

@Injectable()
export class HttpNotificationRepository extends NotificationRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/notifications`;

  listForUser(_userId: string): Observable<Notification[]> {
    return this.http.get<ListResponse<Record<string, unknown>>>(this.baseUrl).pipe(
      map(({ data }) => data.map(toNotification)),
      mapHttpError(),
    );
  }

  markRead(id: string, _userId: string): Observable<Notification> {
    return this.http.patch<Record<string, unknown>>(`${this.baseUrl}/${id}/read`, {}).pipe(
      map(toNotification),
      mapHttpError(),
    );
  }

  /** PATCH /read-all returns 204 (no body) — refetch to satisfy the Observable<Notification[]> return type. */
  markAllRead(userId: string): Observable<Notification[]> {
    return this.http.patch(`${this.baseUrl}/read-all`, {}).pipe(
      switchMap(() => this.listForUser(userId)),
      mapHttpError(),
    );
  }
}
