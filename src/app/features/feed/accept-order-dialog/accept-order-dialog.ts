import { Component, computed, input, output, signal } from '@angular/core';

import type { Post, User } from '../../../core/models';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

@Component({
  selector: 'app-accept-order-dialog',
  imports: [UiDialog],
  templateUrl: './accept-order-dialog.html',
  styleUrl: './accept-order-dialog.scss',
})
export class AcceptOrderDialog {
  readonly post = input.required<Post>();
  readonly author = input<User>();
  readonly cancelled = output<void>();
  readonly confirmed = output<string>();

  protected readonly note = signal('');
  protected readonly actionLabel = computed(() =>
    this.post().type === 'request' ? 'Xác nhận nhận việc' : 'Gửi yêu cầu đặt dịch vụ',
  );
  protected readonly price = computed(() =>
    new Intl.NumberFormat('vi-VN').format(this.post().price),
  );

  protected updateNote(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }

  protected submit(): void {
    this.confirmed.emit(this.note().trim());
  }
}
