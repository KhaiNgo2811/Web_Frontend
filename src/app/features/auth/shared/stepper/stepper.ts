import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export interface StepperStep {
  label: string;
}

@Component({
  selector: 'app-stepper',
  imports: [NgClass],
  template: `
    <div class="stepper">
      @for (step of steps; track step; let i = $index) {
        <div class="stepper__item">
          <div
            class="stepper__circle"
            [ngClass]="{
              'stepper__circle--active': i + 1 === currentStep,
              'stepper__circle--completed': i + 1 < currentStep
            }"
          >
            @if (i + 1 < currentStep) {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            } @else {
              {{ i + 1 }}
            }
          </div>
          <span
            class="stepper__label"
            [ngClass]="{
              'stepper__label--active': i + 1 === currentStep,
              'stepper__label--completed': i + 1 < currentStep
            }"
          >
            {{ step.label }}
          </span>
        </div>
        @if (i < steps.length - 1) {
          <div
            class="stepper__line"
            [ngClass]="{
              'stepper__line--completed': i + 1 < currentStep
            }"
          ></div>
        }
      }
    </div>
  `,
  styleUrl: './stepper.scss',
})
export class Stepper {
  @Input() steps: StepperStep[] = [];
  @Input() currentStep = 1;
}