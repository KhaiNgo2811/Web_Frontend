import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { isAdminRole } from '../../../core/models';
import { SessionStore } from '../../../core/stores/session.store';
import { GoogleAuthService } from '../../../core/services/google-auth.service';
import { AuthCard } from '../shared/auth-card/auth-card';

@Component({
  selector: 'app-login-page',
  imports: [AuthCard, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);
  private readonly googleAuth = inject(GoogleAuthService);

  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly googleLoading = signal(false);
  readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false],
  });

  async ngOnInit(): Promise<void> {
    await this.googleAuth.initialize();
  }

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

  async loginWithGoogle(): Promise<void> {
    this.errorMessage.set('');
    this.googleLoading.set(true);

    try {
      await this.googleAuth.signIn();

      // Use the existing googleLogin method which handles mock data
      this.sessionStore.googleLogin();
      void this.router.navigateByUrl(this.returnUrl());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng nhập Google thất bại.';
      this.errorMessage.set(message);
    } finally {
      this.googleLoading.set(false);
    }
  }

  private returnUrl(): string {
    const value = this.route.snapshot.queryParamMap.get('returnUrl');
    if (value?.startsWith('/') && !value.startsWith('//')) return value;
    return isAdminRole(this.sessionStore.currentUser()?.role ?? '') ? '/admin' : '/feed';
  }
}