import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { SessionStore } from '../../../core/stores/session.store';
import { ANTGO_POLICY } from '../../../core/mock/demo-policy';
import { Stepper } from '../shared/stepper/stepper';
import { BrandLogo } from '../../../shared/brand-logo/brand-logo';

type RegisterStep = 'details' | 'verify' | 'success';

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirmation = control.get('passwordConfirmation')?.value as string | undefined;
  return password === confirmation ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [Stepper, BrandLogo, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);

  readonly step = this.resolveStep(this.router.url);
  readonly showPassword = signal(false);
  readonly otpError = signal('');
  readonly resendMessage = signal('');
  readonly resendCountdown = signal(0);
  readonly registeredPhone = signal('');
  readonly registeredName = signal('');
  readonly termsDialogOpen = signal(false);
  readonly detailsError = signal('');
  readonly otpSlots = [0, 1, 2, 3, 4, 5];
  readonly policy = ANTGO_POLICY;

  readonly stepperSteps = [{ label: 'Thông tin' }, { label: 'Xác minh' }, { label: 'Hoàn tất' }];

  readonly areas = [
    { value: 'khu-a', label: 'KTX Khu A' },
    { value: 'khu-b', label: 'KTX Khu B' },
    { value: 'khu-c', label: 'KTX Khu C' },
  ];

  get currentStep(): number {
    if (this.step === 'verify') return 2;
    if (this.step === 'success') return 3;
    return 1;
  }

  readonly detailsForm = this.formBuilder.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.pattern(/^(0|\+84)\d{9,10}$/)]],
      email: ['', Validators.email],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirmation: ['', Validators.required],
      area: [''],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: matchingPasswords },
  );
  readonly otpControl = this.formBuilder.nonNullable.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Phone and name are set during submitDetails()
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  submitDetails(): void {
    if (this.detailsForm.invalid) {
      this.detailsForm.markAllAsTouched();
      return;
    }

    this.detailsError.set('');
    const { displayName, phone, email, password } = this.detailsForm.getRawValue();
    this.sessionStore
      .register({
        displayName: displayName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      })
      .subscribe({
        next: () => {
          this.registeredPhone.set(phone.trim());
          this.registeredName.set(displayName.trim());
          this.startResendCountdown();
          void this.router.navigateByUrl('/auth/register/verify');
        },
        error: (error: unknown) => {
          this.detailsError.set(error instanceof Error ? error.message : 'Đăng ký thất bại.');
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

  verifyOtp(): void {
    this.otpControl.markAsTouched();
    if (this.otpControl.invalid) return;

    this.otpError.set('');
    this.sessionStore.verifyOtp(this.otpControl.value).subscribe({
      next: () => void this.router.navigateByUrl('/auth/register/success'),
      error: () => this.otpError.set('Mã xác thực chưa đúng. Dùng 123456 cho bản demo.'),
    });
  }

  resendOtp(): void {
    this.resendMessage.set('Mã xác thực mới đã được gửi.');
    this.startResendCountdown();
  }

  goBack(): void {
    void this.router.navigateByUrl('/auth/register');
  }

  goHome(): void {
    void this.router.navigateByUrl('/feed');
  }

  openTermsDialog(): void {
    this.termsDialogOpen.set(true);
  }

  closeTermsDialog(): void {
    this.termsDialogOpen.set(false);
  }

  otpDigit(index: number): string {
    return this.otpControl.value.at(index) ?? '';
  }

  private startResendCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.resendCountdown.set(48);
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

  private resolveStep(url: string): RegisterStep {
    if (url.includes('/success')) return 'success';
    if (url.includes('/verify')) return 'verify';
    return 'details';
  }
}
