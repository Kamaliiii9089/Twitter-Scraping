#!/usr/bin/env node

/**
 * Quick Start Script for Twitter Scraper UI
 * This script helps you get started quickly
 */

console.log(`
🚀 Twitter Scraper UI - Quick Start
=====================================

📂 Project Structure Created:
   ├── server/          Backend (Node.js + Express)
   ├── client/          Frontend (React + Vite)
   ├── .env            Environment configuration
   └── package.json    Main package file

📋 Next Steps:
1. Configure your .env file with Twitter cookie
2. Run the development server
3. Open your browser and start scraping!

🔧 Available Commands:
   npm run dev         Start both frontend and backend
   npm run server:dev  Start backend only
   npm run client:dev  Start frontend only
   npm run build       Build for production
   npm start           Start production server

🌐 URLs:
   Frontend: http://localhost:3000
   Backend:  http://localhost:3001

💡 Tips:
   - You need a Twitter session cookie to scrape
   - Discord webhook and Airtable are optional
   - The scraper will work with just the cookie

📖 Need help? Check README.md for detailed instructions!
`);

const fs = require('fs');
const path = require('path');

// Check if .env file exists and has twitter cookie
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasTwitterCookie = envContent.includes('TWITTER_COOKIE=') && 
                          !envContent.includes('TWITTER_COOKIE=your_twitter_session_cookie_here');
  
  if (hasTwitterCookie) {
    console.log('✅ Environment configured - you can start scraping!');
    console.log('Run: npm run dev');
  } else {
    console.log('⚠️  Please configure your TWITTER_COOKIE in .env file');
  }
} else {
  console.log('⚠️  .env file not found - run setup.bat or setup.sh first');
}

console.log('\n📚 Documentation: README.md');
console.log('🐛 Issues? Check the troubleshooting section in README.md\n');
