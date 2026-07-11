declare namespace google {
  namespace accounts {
    namespace id {
      interface Client {
        // Google Identity Services client
      }

      interface CredentialResponse {
        credential: string;
        select_by: string;
      }

      interface PromptMomentNotification {
        isNotDisplayed(): boolean;
        isSkippedMoment(): boolean;
        isDismissedMoment(): boolean;
      }

      interface GsiButtonConfiguration {
        theme?: 'outline' | 'filled_blue' | 'filled_black';
        size?: 'large' | 'medium' | 'small';
        type?: 'standard' | 'icon';
        text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
        shape?: 'rectangular' | 'pill' | 'circle' | 'square';
        logo_alignment?: 'left' | 'center';
        width?: number;
        locale?: string;
      }

      interface IdConfiguration {
        client_id: string;
        callback?: (response: CredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        prompt_parent_id?: string;
        nonce?: string;
        context?: string;
        state_cookie_domain?: string;
        ux_mode?: 'popup' | 'redirect';
        allowed_parent_origin?: string | string[];
        intermediate_iframe_close_callback?: () => void;
        itp_support?: boolean;
        login_hint?: string;
        hd?: string;
      }

      function initialize(config: IdConfiguration): void;
      function prompt(callback?: (notification: PromptMomentNotification) => void): void;
      function renderButton(parent: HTMLElement, options: GsiButtonConfiguration): void;
      function disableAutoSelect(): void;
      function revoke(callback: (response: { successful: boolean; error: string }) => void): void;
    }

    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        expires_in: number;
        scope: string;
        token_type: string;
        error?: string;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        state?: string;
        enable_serial_consent?: boolean;
        hint?: string;
        login_hint?: string;
        hosted_domain?: string;
        include_granted_scopes?: boolean;
      }

      interface TokenClient {
        requestAccessToken(overrideConfig?: {
          prompt?: 'consent' | 'select_account' | '';
          login_hint?: string;
          state?: string;
        }): void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}