import type { AuditTargetType } from '../../../core/models';

const TARGET_BADGE_CLASSES: Readonly<Record<AuditTargetType, string>> = {
  user: 'bg-blue-lt',
  moderation_report: 'bg-purple-lt',
  complaint: 'bg-red-lt',
  configuration: 'bg-orange-lt',
  export: 'bg-secondary-lt',
  region: 'bg-cyan-lt',
  service_category: 'bg-yellow-lt',
  admin_account: 'bg-green-lt',
  post_boost_tier: 'bg-orange-lt',
  provider_promotion_plan: 'bg-orange-lt',
  review: 'bg-purple-lt',
};

export function auditTargetBadgeClass(targetType: AuditTargetType): string {
  return TARGET_BADGE_CLASSES[targetType] ?? 'bg-secondary-lt';
}

export function auditActionBadgeClass(action: string): string {
  if (action.includes('remove') || action.includes('hide') || action.includes('locked')) {
    return 'bg-red-lt';
  }
  if (action.includes('create')) return 'bg-green-lt';
  if (action.includes('restore') || action.includes('active')) return 'bg-blue-lt';
  return 'bg-orange-lt';
}
