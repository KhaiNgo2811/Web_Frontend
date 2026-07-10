import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SessionStore } from '../../../core/stores/session.store';
import { AuthCard } from '../shared/auth-card/auth-card';

@Component({
  selector: 'app-login-page',
  imports: [AuthCard, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);

  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false],
  });

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { identifier, password, remember } = this.form.getRawValue();
    if (!this.sessionStore.login(identifier.trim(), password, remember)) {
      this.errorMessage.set('Số điện thoại, email hoặc mật khẩu chưa chính xác.');
      return;
    }

    void this.router.navigateByUrl(this.returnUrl());
  }

  loginWithGoogle(): void {
    this.errorMessage.set('');
    this.sessionStore.googleLogin();
    void this.router.navigateByUrl(this.returnUrl());
  }

  private returnUrl(): string {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    return value?.startsWith('/') && !value.startsWith('//') ? value : '/feed';
  }
}
