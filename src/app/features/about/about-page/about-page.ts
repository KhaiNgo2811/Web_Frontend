import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface StatItem {
  value: string;
  label: string;
}

interface MissionItem {
  icon: string;
  title: string;
  description: string;
}

interface StepItem {
  step: number;
  title: string;
  description: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const STATS: readonly StatItem[] = [
  { value: '5.200+', label: 'Sinh viên tham gia' },
  { value: '12.500+', label: 'Đơn hàng hoàn thành' },
  { value: '15 phút', label: 'Thời gian phản hồi trung bình' },
];

const MISSIONS: readonly MissionItem[] = [
  {
    icon: 'bi-people',
    title: 'Tương trợ lẫn nhau',
    description:
      'Kết nối sinh viên trong cùng khu KTX để cùng nhau giải quyết những việc nhỏ hằng ngày.',
  },
  {
    icon: 'bi-lightning-charge',
    title: 'Tiết kiệm & nhanh chóng',
    description:
      'Đăng một yêu cầu, nhận phản hồi trong vài phút thay vì phải tự đi làm hoặc tìm dịch vụ bên ngoài.',
  },
  {
    icon: 'bi-shield-check',
    title: 'Cộng đồng tin cậy',
    description:
      'Hệ thống đánh giá hai chiều và điểm uy tín giúp mọi giao dịch trong nội khu minh bạch hơn.',
  },
];

const STEPS: readonly StepItem[] = [
  {
    step: 1,
    title: 'Đăng đơn của bạn',
    description: 'Chia sẻ việc bạn cần giúp hoặc dịch vụ bạn có thể cung cấp cho hàng xóm.',
  },
  {
    step: 2,
    title: 'Kết nối & nhận đơn',
    description: 'Trò chuyện qua Messenger nội bộ, thống nhất chi tiết rồi xác nhận đơn hàng.',
  },
  {
    step: 3,
    title: 'Hoàn thành & nhận Xu',
    description: 'Hoàn tất công việc, đánh giá lẫn nhau và tích lũy Ant Xu cho lần sau.',
  },
];

const FEATURES: readonly FeatureItem[] = [
  {
    icon: 'bi-signpost-split',
    title: 'Luồng việc "Cần giúp" và "Cung cấp"',
    description: 'Đăng yêu cầu khi cần hỗ trợ, hoặc đăng dịch vụ để chủ động nhận việc.',
  },
  {
    icon: 'bi-wallet2',
    title: 'Ví Xu & hệ thống Ant Xu',
    description: 'Tích Xu miễn phí mỗi ngày, dùng để đẩy bài hoặc quảng bá hồ sơ dịch vụ.',
  },
  {
    icon: 'bi-chat-dots',
    title: 'Kênh Chat Messenger nội bộ',
    description: 'Trao đổi trực tiếp trong ứng dụng, không cần lộ số điện thoại cá nhân.',
  },
  {
    icon: 'bi-star',
    title: 'Đánh giá tin cậy song phương',
    description: 'Cả hai bên đánh giá lẫn nhau sau mỗi giao dịch để xây dựng uy tín lâu dài.',
  },
];

const FAQS: readonly FaqItem[] = [
  {
    question: 'AntGo có thu phí khi đăng bài không?',
    answer: 'Không. Đăng yêu cầu hoặc dịch vụ hoàn toàn miễn phí; bạn chỉ dùng Ant Xu nếu muốn đẩy bài lên vị trí ưu tiên.',
  },
  {
    question: 'Làm thế nào để kiếm thêm Ant Xu?',
    answer: 'Điểm danh hằng ngày, xem video ngắn, hoàn thành nhiệm vụ hệ thống hoặc mời bạn bè tham gia AntGo.',
  },
  {
    question: 'Tôi có thể vừa đăng yêu cầu vừa cung cấp dịch vụ không?',
    answer: 'Có. Một tài khoản AntGo có thể vừa là người cần giúp trong đơn này, vừa là người thực hiện ở đơn khác.',
  },
  {
    question: 'Nếu có tranh chấp hoặc sự cố trong giao dịch thì sao?',
    answer: 'AntGo có quy trình xử lý khiếu nại 7 bước — xem chi tiết tại trang Điều khoản & Chính sách.',
  },
];

@Component({
  selector: 'app-about-page',
  imports: [RouterLink],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss',
})
export class AboutPage {
  protected readonly stats = STATS;
  protected readonly missions = MISSIONS;
  protected readonly steps = STEPS;
  protected readonly features = FEATURES;
  protected readonly faqs = FAQS;
  protected readonly openFaqIndex = signal<number | null>(0);

  protected toggleFaq(index: number): void {
    this.openFaqIndex.update((current) => (current === index ? null : index));
  }
}
