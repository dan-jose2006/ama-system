require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

console.log('🔑 Checking Twitter credentials...');
console.log('  API Key:', process.env.TWITTER_API_KEY ? '✅ set' : '❌ missing');
console.log('  API Secret:', process.env.TWITTER_API_SECRET ? '✅ set' : '❌ missing');
console.log('  Access Token:', process.env.TWITTER_ACCESS_TOKEN ? '✅ set' : '❌ missing');
console.log('  Access Secret:', process.env.TWITTER_ACCESS_SECRET ? '✅ set' : '❌ missing');

const client = new TwitterApi({
  appKey:       process.env.TWITTER_API_KEY,
  appSecret:    process.env.TWITTER_API_SECRET,
  accessToken:  process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

async function test() {
  try {
    // Test 1: Verify credentials
    const me = await client.v2.me();
    console.log('\n✅ Twitter auth successful!');
    console.log('  Account:', me.data.name, `(@${me.data.username})`);
    console.log('  ID:', me.data.id);

    // Test 2: Post a test tweet
    const testTweet = `🤖 KIAS AI Content Hub — System test #${Date.now().toString(36)}\n\nAutomated content publishing is live.\n\n#KIAS #AIContent`;
    const { data } = await client.v2.tweet(testTweet);
    console.log('\n🐦 Test tweet posted successfully!');
    console.log('  Tweet ID:', data.id);
    console.log('  URL: https://twitter.com/i/web/status/' + data.id);
  } catch (err) {
    console.error('\n❌ Twitter error:', err.message);
    if (err.data) console.error('  Details:', JSON.stringify(err.data, null, 2));
  }
}

test();
