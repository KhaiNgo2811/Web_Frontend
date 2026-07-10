import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { SessionStore } from '../../../core/stores/session.store';
import { AuthCard } from '../shared/auth-card/auth-card';
import { AuthSuccess } from '../shared/auth-success/auth-success';

type RegisterStep = 'details' | 'verify' | 'success';

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirmation = control.get('passwordConfirmation')?.value as string | undefined;
  return password === confirmation ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [AuthCard, AuthSuccess, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);

  readonly step = this.resolveStep(this.router.url);
  readonly showPassword = signal(false);
  readonly otpError = signal('');
  readonly resendMessage = signal('');
  readonly otpSlots = [0, 1, 2, 3, 4, 5];
  readonly detailsForm = this.formBuilder.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^(0|\+84)\d{9,10}$/)]],
      email: ['', Validators.email],
      password: ['', [Validators.required, Validators.minLength(8)]],
      passwordConfirmation: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: matchingPasswords },
  );
  readonly otpControl = this.formBuilder.nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  submitDetails(): void {
    if (this.detailsForm.invalid) {
      this.detailsForm.markAllAsTouched();
      return;
    }

    const { displayName, phone, email, password } = this.detailsForm.getRawValue();
    this.sessionStore.register({
      displayName: displayName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password,
    });
    void this.router.navigateByUrl('/auth/register/verify');
  }

  normalizeOtp(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = value;
    this.otpControl.setValue(value);
    this.otpError.set('');
  }

  verifyOtp(): void {
    this.otpControl.markAsTouched();
    if (this.otpControl.invalid) return;

    if (!this.sessionStore.verifyOtp(this.otpControl.value)) {
      this.otpError.set('Mã xác thực chưa đúng. Dùng 000000 cho bản demo.');
      return;
    }
    void this.router.navigateByUrl('/auth/register/success');
  }

  resendOtp(): void {
    this.resendMessage.set('Mã xác thực mới đã được gửi.');
  }

  otpDigit(index: number): string {
    return this.otpControl.value.at(index) ?? '';
  }

  private resolveStep(url: string): RegisterStep {
    if (url.includes('/success')) return 'success';
    if (url.includes('/verify')) return 'verify';
    return 'details';
  }
}
