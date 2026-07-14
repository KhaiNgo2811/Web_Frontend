import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type FeedbackCategory = 'bug' | 'feature' | 'other';

interface ContactChannel {
  icon: string;
  title: string;
  description: string;
  action: string;
  href: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const CHANNELS: readonly ContactChannel[] = [
  {
    icon: 'bi-envelope',
    title: 'Email hỗ trợ',
    description: 'Phản hồi trong vòng 24 giờ làm việc.',
    action: 'support@antgo.vn',
    href: 'mailto:support@antgo.vn',
  },
  {
    icon: 'bi-chat-dots',
    title: 'Chat trong ứng dụng',
    description: 'Nhắn trực tiếp với đội ngũ AntGo qua Messenger nội bộ.',
    action: 'Mở Messenger',
    href: '/messages',
  },
  {
    icon: 'bi-file-earmark-text',
    title: 'Điều khoản & Chính sách',
    description: 'Xem quy định sử dụng và chính sách xử lý khiếu nại.',
    action: 'Xem chi tiết',
    href: '/policy',
  },
];

const FAQS: readonly FaqItem[] = [
  {
    question: 'Tôi báo lỗi ứng dụng ở đâu?',
    answer: 'Dùng form "Gửi góp ý & báo lỗi" bên dưới, chọn loại "Báo lỗi" và mô tả chi tiết bước tái hiện lỗi.',
  },
  {
    question: 'Tôi muốn đề xuất tính năng mới thì sao?',
    answer: 'Chọn loại "Đề xuất tính năng" trong form bên dưới — đội ngũ AntGo sẽ xem xét cho các bản cập nhật tiếp theo.',
  },
  {
    question: 'Thời gian phản hồi trung bình là bao lâu?',
    answer: 'Đội ngũ hỗ trợ AntGo phản hồi email và chat trong khung giờ 8:00–22:00 hằng ngày, thường trong vòng vài giờ.',
  },
  {
    question: 'Tôi gặp sự cố với một giao dịch cụ thể thì liên hệ thế nào?',
    answer: 'Vào Đơn hàng → chọn đơn liên quan → "Báo cáo sự cố" để khiếu nại đúng quy trình xử lý tranh chấp của AntGo.',
  },
];

@Component({
  selector: 'app-help-page',
  imports: [RouterLink],
  templateUrl: './help-page.html',
  styleUrl: './help-page.scss',
})
export class HelpPage {
  protected readonly channels = CHANNELS;
  protected readonly faqs = FAQS;
  protected readonly openFaqIndex = signal<number | null>(0);

  protected readonly category = signal<FeedbackCategory>('bug');
  protected readonly message = signal('');
  protected readonly submitted = signal(false);
  protected readonly error = signal('');

  protected toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }

  protected setCategory(category: FeedbackCategory): void {
    this.category.set(category);
  }

  protected setMessage(value: string): void {
    this.message.set(value);
    this.error.set('');
  }

  protected submitFeedback(): void {
    if (this.message().trim().length < 10) {
      this.error.set('Vui lòng mô tả chi tiết hơn (tối thiểu 10 ký tự).');
      return;
    }
    this.submitted.set(true);
    this.message.set('');
  }

  protected sendAnother(): void {
    this.submitted.set(false);
  }
}
