import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  template: '<main class="auth-layout"><router-outlet /></main>',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
