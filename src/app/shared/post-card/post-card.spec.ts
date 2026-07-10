import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DEMO_POSTS, DEMO_USERS } from '../../core/mock';
import { PostCard } from './post-card';

describe('PostCard', () => {
  let fixture: ComponentFixture<PostCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PostCard] }).compileComponents();
    fixture = TestBed.createComponent(PostCard);
    fixture.componentRef.setInput('post', DEMO_POSTS[0]);
    fixture.componentRef.setInput('author', DEMO_USERS.find((user) => user.id === DEMO_POSTS[0].authorId));
    fixture.detectChanges();
  });

  it('renders the post, author, and localized price', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.post-card__title')?.textContent).toContain(DEMO_POSTS[0].title);
    expect(element.querySelector('.post-card__author')?.textContent).toContain('Phạm Ngọc Lan');
    expect(element.querySelector('.post-card__price')?.textContent).toContain('80.000');
  });

  it('emits the selected post from the primary action', () => {
    const emitted: string[] = [];
    fixture.componentInstance.acceptRequested.subscribe((post) => emitted.push(post.id));
    const buttons = fixture.nativeElement.querySelectorAll('.post-card__actions button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    expect(emitted).toEqual(['post-groceries']);
  });
});
