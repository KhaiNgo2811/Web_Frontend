import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DEMO_DATABASE } from '../../core/mock';
import { PostCard } from './post-card';

describe('PostCard', () => {
  let fixture: ComponentFixture<PostCard>;
  const post = DEMO_DATABASE.posts[0];
  const author = DEMO_DATABASE.users.find((user) => user.id === post.authorId);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PostCard] }).compileComponents();
    fixture = TestBed.createComponent(PostCard);
    fixture.componentRef.setInput('post', post);
    fixture.componentRef.setInput('author', author);
    fixture.detectChanges();
  });

  it('renders the post, author, and localized price', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.post-card__title')?.textContent).toContain(post.title);
    expect(element.querySelector('.post-card__author')?.textContent).toContain('Phạm Ngọc Lan');
    expect(element.querySelector('.post-card__price')?.textContent).toContain('80.000');
  });

  it('emits the selected post from the primary action', () => {
    const emitted: string[] = [];
    fixture.componentInstance.acceptRequested.subscribe((post) => emitted.push(post.id));
    const button = fixture.nativeElement.querySelector('.post-card__cta') as HTMLButtonElement;
    button.click();
    expect(emitted).toEqual(['post-groceries']);
  });

  it('emits the selected post from the report button', () => {
    const emitted: string[] = [];
    fixture.componentInstance.reportRequested.subscribe((post) => emitted.push(post.id));
    const button = fixture.nativeElement.querySelector('.post-card__report') as HTMLButtonElement;
    button.click();
    expect(emitted).toEqual(['post-groceries']);
  });
});
