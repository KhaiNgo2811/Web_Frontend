import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
  output,
} from '@angular/core';
import type { AdminConfirmationRequest } from '../../../../core/models';

@Component({
  selector: 'app-admin-confirm-dialog',
  templateUrl: './admin-confirm-dialog.html',
  styleUrl: './admin-confirm-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminConfirmDialog implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input({ required: true }) request!: AdminConfirmationRequest;
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;
  @ViewChild('cancelButton') private cancelButton?: ElementRef<HTMLButtonElement>;
  private restoreTarget: HTMLElement | null = null;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isolatedElements = new Map<HTMLElement, boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue && !changes['open'].previousValue) {
      this.restoreTarget =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.isolateBackground();
      window.setTimeout(() => this.cancelButton?.nativeElement.focus(), 0);
    }
    if (changes['open']?.currentValue === false && changes['open'].previousValue) {
      this.releaseBackground();
      this.restoreFocus();
    }
  }

  ngOnDestroy(): void {
    this.releaseBackground();
  }

  protected cancel(): void {
    this.releaseBackground();
    this.cancelled.emit();
  }

  protected confirm(): void {
    this.releaseBackground();
    this.confirmed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeydown(event: KeyboardEvent): void {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      this.panel?.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  private restoreFocus(): void {
    window.setTimeout(() => this.restoreTarget?.isConnected && this.restoreTarget.focus(), 0);
  }

  private isolateBackground(): void {
    let active = this.host.nativeElement;
    while (active.parentElement && active.parentElement !== document.body) {
      for (const sibling of Array.from(active.parentElement.children)) {
        if (sibling instanceof HTMLElement && sibling !== active) {
          this.isolatedElements.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      active = active.parentElement;
    }
  }

  private releaseBackground(): void {
    for (const [element, wasInert] of this.isolatedElements) element.inert = wasInert;
    this.isolatedElements.clear();
  }
}
