import { ChangeDetectionStrategy, Component, inject, signal, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { SessionStore } from '../../../core/stores/session.store';
import { BrandLogo } from '../../../shared/brand-logo/brand-logo';

type RecoveryStep = 'identifier' | 'verify' | 'reset' | 'success';

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirmation = control.get('passwordConfirmation')?.value as string | undefined;
  return password === confirmation ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-password-recovery-page',
  imports: [BrandLogo, ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoveryPage implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);

  readonly step = this.resolveStep(this.router.url);
  readonly showPassword = signal(false);
  readonly identifier = this.readIdentifier();
  readonly otpError = signal('');
  readonly resetError = signal('');
  readonly resendCountdown = signal(0);
  readonly otpSlots = [0, 1, 2, 3, 4, 5];

  readonly identifierForm = this.formBuilder.nonNullable.group({
    identifier: ['', Validators.required],
  });
  readonly otpControl = this.formBuilder.nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);
  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirmation: ['', Validators.required],
    },
    { validators: matchingPasswords },
  );

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if ((this.step === 'verify' || this.step === 'reset') && !this.identifier) {
      void this.router.navigateByUrl('/auth/forgot-password');
    }
    if (this.step === 'verify') {
      this.startResendCountdown();
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  submitIdentifier(): void {
    if (this.identifierForm.invalid) {
      this.identifierForm.markAllAsTouched();
      return;
    }

    const identifier = this.identifierForm.controls.identifier.value.trim();
    void this.router.navigate(['/auth/forgot-password/verify'], { state: { identifier } });
  }

  verifyOtp(): void {
    this.otpControl.markAsTouched();
    if (this.otpControl.invalid) return;

    // Demo OTP: 123456
    if (this.otpControl.value !== '123456') {
      this.otpError.set('Mã OTP chưa đúng. Dùng 123456 cho bản demo.');
      return;
    }

    void this.router.navigate(['/auth/forgot-password/reset'], { state: { identifier: this.identifier } });
  }

  resendOtp(): void {
    this.startResendCountdown();
  }

  submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    if (!this.identifier) return;

    this.resetError.set('');
    this.sessionStore
      .resetPassword(this.identifier, this.passwordForm.controls.password.value)
      .subscribe({
        next: () => void this.router.navigateByUrl('/auth/forgot-password/success'),
        error: (error: unknown) => {
          this.resetError.set(error instanceof Error ? error.message : 'Đặt lại mật khẩu thất bại.');
        },
      });
  }

  normalizeOtp(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = value;
    this.otpControl.setValue(value);
    this.otpError.set('');
  }

  otpDigit(index: number): string {
    return this.otpControl.value.at(index) ?? '';
  }

  goBack(): void {
    if (this.step === 'verify') {
      void this.router.navigateByUrl('/auth/forgot-password');
    } else if (this.step === 'reset') {
      void this.router.navigate(['/auth/forgot-password/verify'], { state: { identifier: this.identifier } });
    } else {
      void this.router.navigateByUrl('/auth/forgot-password');
    }
  }

  private startResendCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.resendCountdown.set(52);
    this.countdownInterval = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 1) {
        this.resendCountdown.set(0);
        if (this.countdownInterval) {
          clearInterval(this.countdownInterval);
        }
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }

  private readIdentifier(): string {
    const navigationValue = this.router.getCurrentNavigation()?.extras.state?.['identifier'];
    const historyValue = globalThis.history?.state?.identifier as unknown;
    const value = navigationValue ?? historyValue;
    return typeof value === 'string' ? value : '';
  }

  private resolveStep(url: string): RecoveryStep {
    if (url.includes('/success')) return 'success';
    if (url.includes('/reset')) return 'reset';
    if (url.includes('/verify')) return 'verify';
    return 'identifier';
  }
}