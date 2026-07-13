import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
})
export class StarRating {
  readonly value = input(0);
  readonly readonly = input(false);
  readonly valueChange = output<number>();
  protected readonly stars = [1, 2, 3, 4, 5];
}
