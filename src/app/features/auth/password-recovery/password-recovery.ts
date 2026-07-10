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

type RecoveryStep = 'identifier' | 'reset' | 'success';

function matchingPasswords(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirmation = control.get('passwordConfirmation')?.value as string | undefined;
  return password === confirmation ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-password-recovery-page',
  imports: [AuthCard, AuthSuccess, ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.html',
  styleUrl: './password-recovery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoveryPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly sessionStore = inject(SessionStore);

  readonly step = this.resolveStep(this.router.url);
  readonly showPassword = signal(false);
  readonly identifier = this.readIdentifier();
  readonly identifierForm = this.formBuilder.nonNullable.group({
    identifier: ['', Validators.required],
  });
  readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      passwordConfirmation: ['', Validators.required],
    },
    { validators: matchingPasswords },
  );

  constructor() {
    if (this.step === 'reset' && !this.identifier) {
      void this.router.navigateByUrl('/auth/forgot-password');
    }
  }

  submitIdentifier(): void {
    if (this.identifierForm.invalid) {
      this.identifierForm.markAllAsTouched();
      return;
    }

    const identifier = this.identifierForm.controls.identifier.value.trim();
    void this.router.navigate(['/auth/forgot-password/reset'], { state: { identifier } });
  }

  submitPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    if (!this.identifier) return;

    this.sessionStore.resetPassword(this.identifier, this.passwordForm.controls.password.value);
    void this.router.navigateByUrl('/auth/forgot-password/success');
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
    return 'identifier';
  }
}
