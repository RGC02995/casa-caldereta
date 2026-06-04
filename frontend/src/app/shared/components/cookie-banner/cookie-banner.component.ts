import { Component, OnInit, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

const CONSENT_STORAGE_KEY = 'casa-caldereta-cookie-consent';

export interface CookieConsent {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

@Component({
  selector: 'cookie-banner',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-banner.component.html',
  styleUrl: './cookie-banner.component.scss',
})
export class CookieBannerComponent implements OnInit {
  // ── Output ───────────────────────────────────────────────────────────────────
  readonly consentSaved = output<CookieConsent>();

  // ── Estado interno ───────────────────────────────────────────────────────────
  readonly isVisible        = signal(false);
  readonly isExpanded       = signal(false);
  readonly analyticsConsent = signal(false);
  readonly marketingConsent = signal(false);

  ngOnInit(): void {
    const storedValue = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (storedValue === null) {
      this.isVisible.set(true);
      return;
    }

    try {
      const storedConsent = JSON.parse(storedValue) as CookieConsent;
      this.consentSaved.emit(storedConsent);
    } catch {
      // Dato corrupto en localStorage → mostramos el banner de nuevo
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      this.isVisible.set(true);
    }
  }

  acceptAll(): void {
    this.saveAndClose({ necessary: true, analytics: true, marketing: true });
  }

  rejectAll(): void {
    this.saveAndClose({ necessary: true, analytics: false, marketing: false });
  }

  savePreferences(): void {
    this.saveAndClose({
      necessary: true,
      analytics: this.analyticsConsent(),
      marketing: this.marketingConsent(),
    });
  }

  expand(): void {
    this.isExpanded.set(true);
  }

  onCategoryChange(event: Event, category: 'analytics' | 'marketing'): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (category === 'analytics') this.analyticsConsent.set(checked);
    if (category === 'marketing') this.marketingConsent.set(checked);
  }

  private saveAndClose(consent: Omit<CookieConsent, 'timestamp'>): void {
    const fullConsent: CookieConsent = { ...consent, timestamp: Date.now() };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
    this.consentSaved.emit(fullConsent);
    this.isVisible.set(false);
  }
}
