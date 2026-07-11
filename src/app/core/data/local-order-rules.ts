import type { NotificationType, Order, OrderTransitionInput } from '../models';
import { nowIso, RepositoryError } from './local-repository.utils';

export interface TransitionEvent {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
}

export function applyOrderTransition(order: Order, input: OrderTransitionInput): TransitionEvent {
  if (![order.customerId, order.providerId].includes(input.actorId)) {
    throw new RepositoryError('Bạn không thuộc đơn hàng này.');
  }

  const now = nowIso();
  if (input.action === 'start') {
    if (input.actorId !== order.providerId || order.status !== 'pending') {
      throw new RepositoryError('Đơn hàng chưa thể bắt đầu.');
    }
    order.status = 'in_progress';
    order.statusHistory.push({ status: 'in_progress', at: now, byUserId: input.actorId });
    return {
      recipientId: order.customerId,
      type: 'order_started',
      title: 'Công việc đã bắt đầu',
      body: `Đơn ${order.code} đang được thực hiện.`,
    };
  }

  if (input.action === 'report_done') {
    if (input.actorId !== order.providerId || order.status !== 'in_progress') {
      throw new RepositoryError('Chưa thể báo hoàn thành công việc.');
    }
    order.providerReportedDoneAt = now;
    order.autoCompleteDeadline = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    order.statusHistory.push({
      status: 'in_progress',
      at: now,
      byUserId: input.actorId,
      note: 'Đã báo hoàn thành',
    });
    return {
      recipientId: order.customerId,
      type: 'work_reported_done',
      title: 'Công việc đã hoàn tất',
      body: `Vui lòng xác nhận đơn ${order.code}.`,
    };
  }

  if (input.action === 'confirm_complete') {
    if (
      input.actorId !== order.customerId ||
      order.status !== 'in_progress' ||
      !order.providerReportedDoneAt
    ) {
      throw new RepositoryError('Đơn hàng chưa thể xác nhận hoàn thành.');
    }
    order.status = 'completed';
    order.customerConfirmedAt = now;
    order.statusHistory.push({ status: 'completed', at: now, byUserId: input.actorId });
    if (order.escrowState === 'held') order.escrowState = 'released';
    return {
      recipientId: order.providerId,
      type: 'order_completed',
      title: 'Đơn hàng đã hoàn thành',
      body: `Đơn ${order.code} đã được khách hàng xác nhận.`,
    };
  }

  if (input.action === 'cancel') {
    if (!['pending', 'in_progress'].includes(order.status)) {
      throw new RepositoryError('Đơn hàng không thể hủy.');
    }
    if (order.status === 'in_progress' && !input.reason?.trim()) {
      throw new RepositoryError('Vui lòng nhập lý do hủy đơn.');
    }
    order.status = 'cancelled';
    order.cancelReason = input.reason?.trim();
    order.statusHistory.push({
      status: 'cancelled',
      at: now,
      byUserId: input.actorId,
      note: order.cancelReason,
    });
    return {
      recipientId: input.actorId === order.customerId ? order.providerId : order.customerId,
      type: 'order_cancelled',
      title: 'Đơn hàng đã bị hủy',
      body: `Đơn ${order.code} đã được hủy.`,
    };
  }

  throw new RepositoryError('Thao tác đơn hàng không hợp lệ.');
}
