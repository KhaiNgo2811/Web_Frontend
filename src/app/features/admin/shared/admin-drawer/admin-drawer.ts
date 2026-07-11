import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  inject,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  output,
} from '@angular/core';

@Component({
  selector: 'app-admin-drawer',
  templateUrl: './admin-drawer.html',
  styleUrl: './admin-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDrawer implements OnChanges, OnDestroy {
  private static nextId = 0;
  @Input({ required: true }) open = false;
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() width: 'moderation' | 'complaint' = 'moderation';

  readonly closed = output<void>();
  protected readonly titleId = `admin-drawer-title-${AdminDrawer.nextId++}`;
  protected readonly descriptionId = `${this.titleId}-description`;

  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  private restoreTarget: HTMLElement | null = null;
  private readonly isolatedElements = new Map<HTMLElement, boolean>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']?.currentValue && !changes['open'].previousValue) {
      this.restoreTarget =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.body.classList.add('admin-drawer-open');
      this.isolateBackground();
      window.setTimeout(() => this.closeButton?.nativeElement.focus(), 0);
    } else if (changes['open']?.currentValue === false) {
      this.releaseBackground();
    }
  }

  ngOnDestroy(): void {
    this.releaseBackground();
  }

  requestClose(): void {
    this.releaseBackground();
    this.closed.emit();
    window.setTimeout(() => {
      const fallback = document.querySelector<HTMLElement>('.admin-main h1, .admin-page h2');
      (this.restoreTarget?.isConnected ? this.restoreTarget : fallback)?.focus();
    }, 0);
  }

  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open) return;
    if (event.key === 'Escape') {
      if (document.querySelector('app-admin-confirm-dialog .admin-confirm')) return;
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = this.focusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    const panel = this.panel?.nativeElement;
    if (!panel) return [];
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
  }

  private isolateBackground(): void {
    let active: HTMLElement = this.host.nativeElement;
    while (active.parentElement && active.parentElement !== document.body) {
      for (const sibling of Array.from(active.parentElement.children)) {
        if (sibling instanceof HTMLElement && sibling !== active) {
          this.isolatedElements.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      active = active.parentElement;
    }
    document.body.classList.add('admin-drawer-open');
  }

  private releaseBackground(): void {
    document.body.classList.remove('admin-drawer-open');
    for (const [element, wasInert] of this.isolatedElements) element.inert = wasInert;
    this.isolatedElements.clear();
  }
}
