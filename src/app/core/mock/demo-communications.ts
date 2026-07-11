import type { Conversation, Message, Notification } from '../models';

export const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'conversation-plants',
    postId: 'post-plants',
    orderId: 'order-plants',
    participantIds: ['user-demo', 'user-minh'],
    createdAt: '2026-07-09T07:00:00.000Z',
    updatedAt: '2026-07-10T01:10:00.000Z',
  },
  {
    id: 'conversation-tutor',
    postId: 'post-tutor',
    orderId: 'order-tutor',
    participantIds: ['user-demo', 'user-lan'],
    createdAt: '2026-07-08T09:00:00.000Z',
    updatedAt: '2026-07-08T14:20:00.000Z',
  },
];

export const DEMO_MESSAGES: Message[] = [
  {
    id: 'message-plants-1',
    conversationId: 'conversation-plants',
    orderId: 'order-plants',
    senderId: 'user-demo',
    kind: 'text',
    content: 'Chào Minh, mình đã để chìa khóa ở quầy lễ tân nhé.',
    hidden: false,
    createdAt: '2026-07-09T07:10:00.000Z',
  },
  {
    id: 'message-plants-2',
    conversationId: 'conversation-plants',
    orderId: 'order-plants',
    senderId: 'user-minh',
    kind: 'text',
    content: 'Mình nhận được rồi. Sáng mai mình sẽ ghé tưới cây lần đầu.',
    hidden: true,
    createdAt: '2026-07-09T07:15:00.000Z',
  },
  {
    id: 'message-plants-3',
    conversationId: 'conversation-plants',
    orderId: 'order-plants',
    senderId: 'user-minh',
    kind: 'image',
    content: 'Ảnh cây sau khi tưới',
    hidden: false,
    attachment: { url: '/assets/antgo/demo-plants.svg', name: 'cay-ban-cong.svg' },
    createdAt: '2026-07-10T01:10:00.000Z',
  },
  {
    id: 'message-tutor-1',
    conversationId: 'conversation-tutor',
    orderId: 'order-tutor',
    senderId: 'user-lan',
    kind: 'text',
    content: 'Cảm ơn bạn, buổi học hôm nay rất hữu ích.',
    hidden: false,
    createdAt: '2026-07-08T14:15:00.000Z',
  },
];

export const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notification-aircon-application',
    userId: 'user-demo',
    type: 'application_received',
    title: 'Có người muốn nhận việc',
    body: 'Quang Minh đã gửi đề nghị cho bài đăng vệ sinh máy lạnh.',
    route: '/orders',
    read: false,
    createdAt: '2026-07-10T02:20:00.000Z',
  },
  {
    id: 'notification-plants-started',
    userId: 'user-demo',
    type: 'order_started',
    title: 'Công việc đã bắt đầu',
    body: 'Quang Minh đã bắt đầu chăm cây theo lịch.',
    route: '/orders/order-plants',
    orderId: 'order-plants',
    read: false,
    createdAt: '2026-07-10T00:30:00.000Z',
  },
  {
    id: 'notification-tutor-review',
    userId: 'user-demo',
    type: 'review_received',
    title: 'Bạn nhận được đánh giá mới',
    body: 'Ngọc Lan đã đánh giá 5 sao cho buổi học.',
    route: '/orders/order-tutor',
    orderId: 'order-tutor',
    read: true,
    createdAt: '2026-07-08T14:20:00.000Z',
  },
];
