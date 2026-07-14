import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { UpdateUserInput, User } from '../models';
import { toUser } from './http-mappers';
import { mapHttpError, mapNotFoundToUndefined, notSupported } from './http-repository.utils';
import { UserRepository } from './repositories';

@Injectable()
export class HttpUserRepository extends UserRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  list(): Observable<User[]> {
    return notSupported('Xem danh sách toàn bộ người dùng chưa được antgo-backend hỗ trợ.');
  }

  getById(id: string): Observable<User | undefined> {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/${id}`).pipe(
      map((raw) => toUser(raw)),
      mapNotFoundToUndefined(),
    );
  }

  update(_id: string, input: UpdateUserInput): Observable<User> {
    // Backend is always "current user" via the JWT, regardless of :id.
    return this.http.patch<Record<string, unknown>>(`${this.baseUrl}/me`, input).pipe(map(toUser), mapHttpError());
  }
}
