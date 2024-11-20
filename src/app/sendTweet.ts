import { initTwitterClient } from '../utils/twitter';

async function main() {
  try {
    const scraper = await initTwitterClient();

    // Send tweet using v1 endpoint
    const tweet = await scraper.sendTweet(
      'Hello World! 👋 ' + new Date().toISOString(),
    );
    console.log('Tweet sent successfully:', tweet);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
