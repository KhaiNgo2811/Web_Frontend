import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import type { Application, Order, OrderAction } from '../../../core/models';
import { MarketplaceStore } from '../../../core/stores/marketplace.store';
import { SessionStore } from '../../../core/stores/session.store';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { StarRating } from '../../../shared/star-rating/star-rating';
import { StatusPill } from '../../../shared/status-pill/status-pill';
import { UiDialog } from '../../../shared/ui-dialog/ui-dialog';

type WorkspaceTab = 'posts' | 'accepted' | 'booked';
type DialogName = 'review' | 'cancel' | 'complaint' | null;

@Component({
  selector: 'app-orders-workspace',
  imports: [FormsModule, RouterLink, EmptyState, StarRating, StatusPill, UiDialog],
  templateUrl: './orders-workspace.html',
  styleUrls: ['./orders-workspace.scss', './orders-detail.scss'],
})
export class OrdersWorkspace {
  protected readonly store = inject(MarketplaceStore);
  protected readonly session = inject(SessionStore);
  protected readonly tab = signal<WorkspaceTab>('booked');
  protected readonly selectedOrderId = signal<string | null>(null);
  protected readonly selectedApplicationId = signal<string | null>(null);
  protected readonly dialog = signal<DialogName>(null);
  protected readonly rating = signal(5);
  protected reviewComment = '';
  protected reason = '';
  protected complaint = '';
  protected readonly currentUserId = computed(() => this.session.currentUser()?.id ?? 'user-demo');
  protected readonly ownPosts = computed(() => this.store.posts().filter((post) => post.authorId === this.currentUserId()));
  protected readonly selectedOrder = computed<Order | undefined>(() => {
    const orders = this.store.orders();
    return orders.find((order) => order.id === this.selectedOrderId()) ?? orders[0];
  });
  protected readonly selectedApplication = computed<Application | undefined>(() => {
    const applications = this.store.applications();
    return applications.find((item) => item.id === this.selectedApplicationId()) ?? applications[0];
  });
  protected readonly selectedPost = computed(() => {
    const id = this.tab() === 'accepted' ? this.selectedApplication()?.postId : this.selectedOrder()?.postId;
    return this.store.posts().find((post) => post.id === id);
  });

  protected userName(id: string | undefined): string {
    return this.store.users().find((user) => user.id === id)?.displayName ?? 'Thành viên AntGo';
  }

  protected chooseTab(tab: WorkspaceTab): void {
    this.tab.set(tab);
  }

  protected selectApplication(id: string): void {
    this.selectedApplicationId.set(id);
  }

  protected acceptApplication(): void {
    const application = this.selectedApplication();
    if (application) this.store.selectApplication(application.id);
  }

  protected transition(action: OrderAction): void {
    const order = this.selectedOrder();
    if (order) this.store.transitionOrder(order.id, action, this.reason || undefined);
    this.dialog.set(null);
    this.reason = '';
  }

  protected submitReview(): void {
    const order = this.selectedOrder();
    if (order) this.store.reviewOrder(order.id, this.rating(), this.reviewComment);
    this.dialog.set(null);
  }

  protected submitComplaint(): void {
    this.dialog.set(null);
    this.complaint = '';
  }
}
