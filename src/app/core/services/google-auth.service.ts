import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  id: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private scriptLoaded = signal(false);

  loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded()) {
        resolve();
        return;
      }

      if (typeof google !== 'undefined' && google.accounts) {
        this.scriptLoaded.set(true);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.scriptLoaded.set(true);
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
      document.head.appendChild(script);
    });
  }

  async initialize(): Promise<void> {
    await this.loadScript();
  }

  signIn(): Promise<GoogleUser> {
    return new Promise((resolve, reject) => {
      if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error('Google Sign-In not available. Please refresh the page.'));
        return;
      }

      // Use OAuth2 token client to open popup
      if (google.accounts.oauth2) {
        const timeout = setTimeout(() => {
          reject(new Error('Popup Google bị chặn hoặc hết thời gian chờ.'));
        }, 60000);

        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: environment.googleClientId,
          scope: 'openid email profile',
          callback: (response: google.accounts.oauth2.TokenResponse) => {
            clearTimeout(timeout);

            if (response.error) {
              reject(new Error(response.error));
              return;
            }

            // Fetch user info
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            })
              .then((res) => res.json())
              .then((data) => {
                resolve({
                  email: data.email || '',
                  name: data.name || '',
                  picture: data.picture || '',
                  id: data.sub || '',
                });
              })
              .catch(() => reject(new Error('Failed to fetch Google user info')));
          },
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        // Fallback to google.accounts.id
        const timeout = setTimeout(() => {
          reject(new Error('Popup Google bị chặn hoặc hết thời gian chờ.'));
        }, 60000);

        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: google.accounts.id.CredentialResponse) => {
            clearTimeout(timeout);
            if (response.credential) {
              const payload = this.parseJwt(response.credential);
              resolve({
                email: payload['email'] || '',
                name: payload['name'] || '',
                picture: payload['picture'] || '',
                id: payload['sub'] || '',
              });
            } else {
              reject(new Error('No credential received'));
            }
          },
          ux_mode: 'popup',
        });

        google.accounts.id.prompt();
      }
    });
  }

  private parseJwt(token: string): Record<string, string> {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  }
}