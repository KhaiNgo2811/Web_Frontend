import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-success',
  imports: [RouterLink],
  templateUrl: './auth-success.html',
  styleUrl: './auth-success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthSuccess {
  readonly message = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly actionLink = input.required<string>();
}
