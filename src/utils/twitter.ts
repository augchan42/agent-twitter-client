import { Scraper } from 'agent-twitter-client';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export async function initTwitterClient() {
  const scraper = new Scraper();
  let isAuthenticated = false;

  // Check for existing cookies
  if (fs.existsSync('./cookies.json')) {
    try {
      const cookiesText = fs.readFileSync('./cookies.json', 'utf8');
      const cookiesArray = JSON.parse(cookiesText);

      // Format cookies for setting
      const cookieStrings = cookiesArray.map(
        (cookie: any) =>
          `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
            cookie.path
          }; ${cookie.secure ? 'Secure' : ''}; ${
            cookie.httpOnly ? 'HttpOnly' : ''
          }; SameSite=${cookie.sameSite || 'Lax'}`,
      );

      await scraper.setCookies(cookieStrings);
      isAuthenticated = await scraper.isLoggedIn();
      console.log(
        'Loaded existing cookies:',
        isAuthenticated ? 'success' : 'failed',
      );
    } catch (e) {
      console.error('Error loading cookies:', e);
    }
  }

  if (!process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD) {
    throw new Error('Twitter credentials are required');
  }
  // If no valid cookies, login with credentials
  if (!isAuthenticated) {
    try {
      await scraper.login(
        process.env.TWITTER_USERNAME,
        process.env.TWITTER_PASSWORD,
        process.env.TWITTER_EMAIL,
      );

      // Save cookies for future use
      const cookies = await scraper.getCookies();
      fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));
      console.log('Logged in and saved new cookies');
    } catch (e) {
      console.error('Login failed:', e);
      throw e;
    }
  }

  return scraper;
}
