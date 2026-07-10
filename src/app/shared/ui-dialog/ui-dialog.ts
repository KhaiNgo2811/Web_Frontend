import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-dialog',
  templateUrl: './ui-dialog.html',
  styleUrl: './ui-dialog.scss',
})
export class UiDialog {
  readonly title = input.required<string>();
  readonly width = input(480);
  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    this.closed.emit();
  }
}
