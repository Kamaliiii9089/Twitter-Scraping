#!/usr/bin/env node

/**
 * Twitter Scraper with Real-time Progress Updates
 * Adapted from the working Twitter scraper with callback support
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
require('dotenv').config();

class TwitterScraper {
  constructor(options = {}) {
    this.searchTerm = options.searchTerm;
    this.minLikes = options.minLikes || 3;
    this.verifiedOnly = options.verifiedOnly !== false;
    this.onProgress = options.onProgress || (() => {});
    this.onTweet = options.onTweet || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    
    this.browser = null;
    this.page = null;
    this.isRunning = false;
    this.tweets = [];
    
    // Static storage for seen tweets across all instances
    if (!TwitterScraper.seenTweets) {
      TwitterScraper.seenTweets = new Map(); // Map of searchTerm -> Set of tweet IDs
    }
    if (!TwitterScraper.searchCounts) {
      TwitterScraper.searchCounts = new Map(); // Map of searchTerm -> search count
    }
  }

  async init() {
    this.onProgress({ status: 'Initializing browser...' });
    
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ],
      defaultViewport: null
    });

    this.page = await this.browser.newPage();
    
    // Set realistic headers
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set cookies from .env if available
    if (process.env.TWITTER_COOKIE) {
      this.onProgress({ status: 'Setting Twitter authentication...' });
      const cookies = this.parseCookieString(process.env.TWITTER_COOKIE);
      await this.page.setCookie(...cookies);
    }
  }

  parseCookieString(cookieString) {
    const cookies = [];
    const pairs = cookieString.split('; ');
    
    for (const pair of pairs) {
      const [name, value] = pair.split('=');
      if (name && value) {
        cookies.push({
          name,
          value,
          domain: '.x.com',
          path: '/',
          httpOnly: false,
          secure: true
        });
      }
    }
    
    return cookies;
  }

  async searchTweets() {
    const query = encodeURIComponent(this.searchTerm);
    const url = `https://x.com/search?q=${query}&src=typed_query`;
    
    // Get search history for this keyword
    const searchKey = this.searchTerm.toLowerCase().trim();
    const searchCount = TwitterScraper.searchCounts.get(searchKey) || 0;
    const seenTweetIds = TwitterScraper.seenTweets.get(searchKey) || new Set();
    
    this.onProgress({ 
      status: `Searching for: "${this.searchTerm}" (Search #${searchCount + 1})`, 
      url,
      isRepeatSearch: searchCount > 0,
      previouslyFound: seenTweetIds.size
    });
    
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    await this.page.waitForTimeout(3000);

    // Wait for tweets to load
    try {
      await this.page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });
    } catch (error) {
      throw new Error('No tweets found or page failed to load');
    }

    // If this is a repeat search, scroll more to find new content
    const scrollAttempts = searchCount > 0 ? Math.min(searchCount * 2 + 3, 10) : 3;
    
    this.onProgress({ 
      status: `Loading tweets... (will scroll ${scrollAttempts} times for fresh content)` 
    });

    // Scroll multiple times to load more tweets
    for (let i = 0; i < scrollAttempts; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(2000);
      
      this.onProgress({ 
        status: `Scrolling for more tweets... (${i + 1}/${scrollAttempts})` 
      });
    }

    this.onProgress({ status: 'Extracting tweets...' });

    // Extract tweets
    const allTweets = await this.page.evaluate(() => {
      const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
      const extractedTweets = [];

      // Helper function for parsing likes in browser context
      function parseLikes(likesText) {
        if (!likesText || likesText === '') return 0;
        
        const text = likesText.toLowerCase().replace(/,/g, '');
        if (text.includes('k')) {
          return Math.floor(parseFloat(text) * 1000);
        } else if (text.includes('m')) {
          return Math.floor(parseFloat(text) * 1000000);
        } else {
          return parseInt(text) || 0;
        }
      }

      tweetElements.forEach((element, index) => {
        try {
          // Extract username
          const usernameElement = element.querySelector('[data-testid="User-Name"] a[role="link"]');
          const username = usernameElement ? usernameElement.textContent.trim().replace('@', '') : null;

          // Extract text
          const textElement = element.querySelector('[data-testid="tweetText"]');
          const text = textElement ? textElement.textContent.trim() : '';

          // Extract likes
          const likesElement = element.querySelector('[data-testid="like"] span');
          const likesText = likesElement ? likesElement.textContent.trim() : '0';
          const likes = parseLikes(likesText);

          // Check if verified (blue checkmark)
          const verifiedElement = element.querySelector('[data-testid="icon-verified"]');
          const isVerified = !!verifiedElement;

          // Extract URL
          const timeElement = element.querySelector('time');
          const tweetUrl = timeElement ? timeElement.closest('a')?.href : null;

          // Extract tweet ID from URL
          const tweetId = tweetUrl ? tweetUrl.split('/status/')[1]?.split('?')[0] : null;

          if (username && text && tweetId) {
            extractedTweets.push({
              id: tweetId,
              username,
              text,
              likes,
              isVerified,
              url: tweetUrl,
              timestamp: new Date().toISOString(),
              source: 'X.com Direct'
            });
          }
        } catch (error) {
          console.log('Error extracting tweet:', error);
        }
      });

      return extractedTweets;
    });

    // Filter out tweets we've already seen for this keyword
    const newTweets = allTweets.filter(tweet => !seenTweetIds.has(tweet.id));
    
    // Update search history
    TwitterScraper.searchCounts.set(searchKey, searchCount + 1);
    
    // Store new tweet IDs as seen
    if (!TwitterScraper.seenTweets.has(searchKey)) {
      TwitterScraper.seenTweets.set(searchKey, new Set());
    }
    const currentSeenTweets = TwitterScraper.seenTweets.get(searchKey);
    newTweets.forEach(tweet => currentSeenTweets.add(tweet.id));

    this.onProgress({ 
      status: `Found ${allTweets.length} total tweets, ${newTweets.length} new tweets`,
      totalFound: allTweets.length,
      newTweets: newTweets.length,
      duplicatesFiltered: allTweets.length - newTweets.length
    });

    return newTweets;
  }

  parseLikes(likesText) {
    if (!likesText || likesText === '') return 0;
    
    const text = likesText.toLowerCase().replace(/,/g, '');
    if (text.includes('k')) {
      return Math.floor(parseFloat(text) * 1000);
    } else if (text.includes('m')) {
      return Math.floor(parseFloat(text) * 1000000);
    } else {
      return parseInt(text) || 0;
    }
  }

  filterTweets(tweets) {
    return tweets.filter(tweet => {
      // Check minimum likes
      if (tweet.likes < this.minLikes) return false;
      
      // Check verified status if required
      if (this.verifiedOnly && !tweet.isVerified) return false;
      
      return true;
    });
  }

  async sendToDiscord(tweet) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return false;

    try {
      const searchKey = this.searchTerm.toLowerCase().trim();
      const searchCount = TwitterScraper.searchCounts.get(searchKey) || 1;
      const isRepeatSearch = searchCount > 1;

      const embed = {
        title: `🐦 ${isRepeatSearch ? 'NEW' : ''} Tweet Found${isRepeatSearch ? ' (Fresh Content!)' : ''}`,
        description: tweet.text,
        color: isRepeatSearch ? 0x00ff00 : 1942002, // Green for new content, blue for first search
        fields: [
          { name: 'Author', value: `@${tweet.username}`, inline: true },
          { name: 'Likes', value: tweet.likes.toString(), inline: true },
          { name: 'Search Term', value: this.searchTerm, inline: true },
          { name: 'Verified', value: tweet.isVerified ? '✅ Yes' : '❌ No', inline: true },
          { name: 'Search Count', value: `#${searchCount}${isRepeatSearch ? ' (New Content)' : ''}`, inline: true }
        ],
        url: tweet.url,
        timestamp: new Date().toISOString(),
        footer: { 
          text: `Custom Twitter Search ${isRepeatSearch ? '• Fresh Content' : ''} | ${tweet.source}` 
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
      });

      return response.ok;
    } catch (error) {
      console.error('Discord error:', error);
      return false;
    }
  }

  async saveToAirtable(tweet) {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!apiKey || !baseId) return false;

    try {
      const url = `https://api.airtable.com/v0/${baseId}/Tweets`;
      const record = {
        fields: {
          'Tweet ID': tweet.id,
          'Username': tweet.username,
          'Text': tweet.text,
          'Likes': tweet.likes,
          'Verified': tweet.isVerified,
          'URL': tweet.url,
          'Search Term': this.searchTerm,
          'Timestamp': tweet.timestamp
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      return response.ok;
    } catch (error) {
      console.error('Airtable error:', error);
      return false;
    }
  }

  static getSearchHistory() {
    const history = [];
    for (const [searchTerm, count] of TwitterScraper.searchCounts.entries()) {
      const seenTweets = TwitterScraper.seenTweets.get(searchTerm) || new Set();
      history.push({
        searchTerm,
        searchCount: count,
        uniqueTweetsFound: seenTweets.size,
        lastSearched: new Date().toISOString()
      });
    }
    return history;
  }

  static clearSearchHistory(searchTerm = null) {
    if (searchTerm) {
      const searchKey = searchTerm.toLowerCase().trim();
      TwitterScraper.searchCounts.delete(searchKey);
      TwitterScraper.seenTweets.delete(searchKey);
    } else {
      TwitterScraper.searchCounts.clear();
      TwitterScraper.seenTweets.clear();
    }
  }

  async start() {
    try {
      this.isRunning = true;
      this.tweets = [];
      
      await this.init();
      
      const allTweets = await this.searchTweets();
      const filteredTweets = this.filterTweets(allTweets);
      
      this.onProgress({ 
        status: 'Processing tweets...', 
        total: filteredTweets.length,
        found: allTweets.length 
      });

      let discordCount = 0;
      let airtableCount = 0;

      for (let i = 0; i < filteredTweets.length; i++) {
        if (!this.isRunning) break;
        
        const tweet = filteredTweets[i];
        
        this.onProgress({ 
          status: `Processing tweet ${i + 1}/${filteredTweets.length}`,
          current: i + 1,
          total: filteredTweets.length
        });

        // Send tweet to callback
        this.onTweet(tweet);

        // Send to Discord and Airtable
        const [discordSuccess, airtableSuccess] = await Promise.all([
          this.sendToDiscord(tweet),
          this.saveToAirtable(tweet)
        ]);

        if (discordSuccess) discordCount++;
        if (airtableSuccess) airtableCount++;

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const results = {
        searchTerm: this.searchTerm,
        totalFound: allTweets.length,
        newTweetsCount: allTweets.length, // allTweets are already filtered for new tweets
        duplicatesFiltered: 0, // This info is now in searchTweets method
        filteredCount: filteredTweets.length,
        discordSent: discordCount,
        airtableSaved: airtableCount,
        tweets: filteredTweets,
        searchHistory: TwitterScraper.getSearchHistory().find(h => h.searchTerm === this.searchTerm.toLowerCase().trim())
      };

      this.onComplete(results);
      
    } catch (error) {
      this.onError(error);
    } finally {
      await this.cleanup();
    }
  }

  async stop() {
    this.isRunning = false;
    await this.cleanup();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
    this.isRunning = false;
  }
}

module.exports = TwitterScraper;
