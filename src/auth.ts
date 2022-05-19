import { gotScraping } from 'got-scraping';

class TwitterAuthInstaller {
  private headers: { [key: string]: unknown };

  private bearerToken: string;
  private cookie?: string;
  private xCsrfToken?: string;

  private getToken: () => string | undefined;
  private shouldUpdate: () => boolean;
  private updateToken: () => Promise<void>;

  constructor(
    headers: { [key: string]: unknown },
    getToken: () => string | undefined,
    shouldUpdate: () => boolean,
    updateToken: () => Promise<void>,
    bearerToken: string,
    cookie?: string,
    xCsrfToken?: string,
  ) {
    this.headers = headers;

    this.getToken = getToken;
    this.shouldUpdate = shouldUpdate;
    this.updateToken = updateToken;

    this.bearerToken = bearerToken;
    this.cookie = cookie;
    this.xCsrfToken = xCsrfToken;
  }

  /**
   * Overrides the bearer token with the provided value.
   * @param value The new bearer token to use.
   */
  withBearerToken(value: string) {
    this.bearerToken = value;
    return this;
  }

  async build() {
    if (this.shouldUpdate()) {
      await this.updateToken();
    }

    const token = this.getToken();
    if (token == null) {
      throw new Error('Authentication token is null or undefined.');
    }

    this.headers['Authorization'] = `Bearer ${this.bearerToken}`;
    this.headers['X-Guest-Token'] = token;

    if (this.cookie != null && this.xCsrfToken != null) {
      this.headers['Cookie'] = this.cookie;
      this.headers['x-csrf-token'] = this.xCsrfToken;
    }
  }
}

export class TwitterGuestAuth {
  private bearerToken: string;
  private cookie?: string;
  private guestToken?: string;
  private guestCreatedAt?: Date;
  private xCsrfToken?: string;

  constructor(bearerToken: string, cookie?: string, xCsrfToken?: string) {
    this.bearerToken = bearerToken;
    this.cookie = cookie;
    this.xCsrfToken = xCsrfToken;
  }

  /**
   * Deletes the authentication token.
   */
  deleteToken() {
    delete this.guestToken;
    delete this.guestCreatedAt;
  }

  /**
   * Returns if the authentication state has a token.
   * @returns `true` if the authentication state has a token; `false` otherwise.
   */
  hasToken() {
    return this.guestToken != null;
  }

  /**
   * Returns the time that authentication was performed.
   * @returns The time at which the authentication token was created, or `null` if it hasn't been created yet.
   */
  authenticatedAt() {
    if (this.guestCreatedAt == null) {
      return null;
    }

    return new Date(this.guestCreatedAt);
  }

  /**
   * Sets a cookie string for use in requests.
   * @param value The new cookie to use in requests.
   */
  useCookie(value: string) {
    this.cookie = value;
  }

  /**
   * Sets a new CSRF token for use in requests.
   * @param value The new CSRF token to use in requests.
   */
  useCsrfToken(value: string) {
    this.xCsrfToken = value;
  }

  /**
   * Installs the authentication information into a headers-like object. If needed, the
   * authentication token will be updated from the API automatically.
   * @param headers A key-value object representing a request's headers.
   * @returns A builder that can be used to add or override other relevant data, or to
   * complete the task.
   */
  installTo(headers: { [key: string]: unknown }) {
    const getToken = (() => {
      return this.guestToken;
    }).bind(this);
    const shouldUpdate = this.shouldUpdate.bind(this);
    const updateToken = this.updateToken.bind(this);

    return new TwitterAuthInstaller(
      headers,
      getToken,
      shouldUpdate,
      updateToken,
      this.bearerToken,
      this.cookie,
      this.xCsrfToken,
    );
  }

  /**
   * Updates the authentication state with a new guest token from the Twitter API.
   */
  async updateToken() {
    const res = await gotScraping.post({
      url: 'https://api.twitter.com/1.1/guest/activate.json',
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });

    if (res.statusCode != 200) {
      throw new Error(res.body);
    }

    const o = JSON.parse(res.body);
    if (o == null || o['guest_token'] == null) {
      throw new Error('guest_token not found.');
    }

    const newGuestToken = o['guest_token'];
    if (typeof newGuestToken !== 'string') {
      throw new Error('guest_token was not a string.');
    }

    this.guestToken = newGuestToken;
    this.guestCreatedAt = new Date();
  }

  /**
   * Returns if the authentication token needs to be updated or not.
   * @returns `true` if the token needs to be updated; `false` otherwise.
   */
  private shouldUpdate() {
    return (
      !this.hasToken() ||
      (this.guestCreatedAt != null &&
        this.guestCreatedAt <
          new Date(new Date().valueOf() - 3 * 60 * 60 * 1000))
    );
  }
}