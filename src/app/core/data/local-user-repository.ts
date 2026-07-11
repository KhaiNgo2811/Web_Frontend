import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { UpdateUserInput, User } from '../models';
import { asObservable, requireValue } from './local-repository.utils';
import { MockDb } from './mock-db';
import { UserRepository } from './repositories';

@Injectable()
export class LocalUserRepository extends UserRepository {
  private readonly db = inject(MockDb);

  list(): Observable<User[]> {
    return asObservable(() => this.db.snapshot().users);
  }

  getById(id: string): Observable<User | undefined> {
    return asObservable(() => this.db.snapshot().users.find((user) => user.id === id));
  }

  update(id: string, input: UpdateUserInput): Observable<User> {
    return asObservable(() =>
      this.db.transaction((data) => {
        const user = requireValue(
          data.users.find((candidate) => candidate.id === id),
          'Không tìm thấy người dùng.',
        );
        Object.assign(user, input);
        return user;
      }),
    );
  }
}
