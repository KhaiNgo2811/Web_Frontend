import type { AdminPermission, User } from '../models';
import { hasAdminPermission } from '../models';
import { RepositoryError, requireValue } from './local-repository.utils';

export function requireAdminPermission(
  users: User[],
  actorId: string,
  permission: AdminPermission,
): User {
  const actor = requireValue(
    users.find((user) => user.id === actorId),
    'Không tìm thấy nhân sự quản trị.',
  );
  if (actor.status !== 'active' || !hasAdminPermission(actor.role, permission)) {
    throw new RepositoryError('Bạn không có quyền thực hiện thao tác này.');
  }
  return actor;
}

export function requireAssignableAdmin(
  users: User[],
  assigneeId: string,
  permission: AdminPermission,
): User {
  return requireAdminPermission(users, assigneeId, permission);
}
