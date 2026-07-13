import type { ServiceCategoryConfig } from '../models';

export const DEMO_SERVICE_CATEGORIES: ServiceCategoryConfig[] = [
  {
    id: 'category-food',
    key: 'food',
    name: 'Ăn uống',
    attributesCount: 6,
    postCount: 0,
    active: true,
  },
  {
    id: 'category-laundry',
    key: 'laundry',
    name: 'Giặt sấy',
    attributesCount: 5,
    postCount: 0,
    active: true,
  },
  {
    id: 'category-repair',
    key: 'repair',
    name: 'Sửa chữa',
    attributesCount: 8,
    postCount: 0,
    active: true,
  },
  {
    id: 'category-goods',
    key: 'goods',
    name: 'Đồ dùng',
    attributesCount: 4,
    postCount: 0,
    active: true,
  },
  {
    id: 'category-support',
    key: 'support',
    name: 'Hỗ trợ',
    attributesCount: 3,
    postCount: 0,
    active: true,
  },
  {
    id: 'category-other',
    key: 'other',
    name: 'Khác',
    attributesCount: 2,
    postCount: 0,
    active: true,
  },
];
