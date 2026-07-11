export type AdminRole = 'support_agent' | 'moderator' | 'complaint_reviewer' | 'super_admin';

export type AdminPermission =
  | 'admin.access'
  | 'users.read'
  | 'users.restrict'
  | 'moderation.read'
  | 'moderation.assign'
  | 'moderation.act'
  | 'complaints.read'
  | 'complaints.assign'
  | 'complaints.decide'
  | 'configuration.manage'
  | 'audit.read'
  | 'audit.export';

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  support_agent: [
    'admin.access',
    'users.read',
    'moderation.read',
    'moderation.assign',
    'complaints.read',
    'complaints.assign',
  ],
  moderator: [
    'admin.access',
    'users.read',
    'moderation.read',
    'moderation.assign',
    'moderation.act',
    'complaints.read',
  ],
  complaint_reviewer: [
    'admin.access',
    'users.read',
    'moderation.read',
    'complaints.read',
    'complaints.assign',
    'complaints.decide',
  ],
  super_admin: [
    'admin.access',
    'users.read',
    'users.restrict',
    'moderation.read',
    'moderation.assign',
    'moderation.act',
    'complaints.read',
    'complaints.assign',
    'complaints.decide',
    'configuration.manage',
    'audit.read',
    'audit.export',
  ],
};

export function isAdminRole(role: string): role is AdminRole {
  return role === 'admin' || role in ROLE_PERMISSIONS;
}

export function hasAdminPermission(role: string, permission: AdminPermission): boolean {
  const effectiveRole: AdminRole | undefined =
    role === 'admin' ? 'super_admin' : isAdminRole(role) ? role : undefined;
  return effectiveRole ? ROLE_PERMISSIONS[effectiveRole].includes(permission) : false;
}
