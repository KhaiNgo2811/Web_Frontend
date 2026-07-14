import { Component, computed, signal } from '@angular/core';

import { ANTGO_POLICY } from '../../../core/mock/demo-policy';

@Component({
  selector: 'app-policy-page',
  imports: [],
  templateUrl: './policy-page.html',
  styleUrl: './policy-page.scss',
})
export class PolicyPage {
  protected readonly policy = ANTGO_POLICY;
  protected readonly searchTerm = signal('');
  protected readonly activeSectionId = signal(ANTGO_POLICY.sections[0]?.id ?? '');

  protected readonly filteredSections = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.policy.sections;
    return this.policy.sections.filter((section) => section.title.toLowerCase().includes(term));
  });

  protected setSearch(value: string): void {
    this.searchTerm.set(value);
  }

  protected scrollToSection(id: string): void {
    this.activeSectionId.set(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected print(): void {
    window.print();
  }
}
