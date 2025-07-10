# Twitter Scraper with React Interface

A modern web application for scraping Twitter/X.com with custom search terms. Features a React frontend with real-time updates and a Node.js backend with Puppeteer scraping.

## Features

- 🔍 **Custom Search**: Enter any word or phrase to search Twitter
- 📱 **Modern UI**: Beautiful React interface with real-time updates
- 🚀 **Real-time Progress**: Live updates via WebSocket connection
- 🎯 **Smart Filtering**: Filter by minimum likes and verified accounts
- 💬 **Discord Integration**: Send results to Discord webhook
- 💾 **Airtable Storage**: Save tweets to Airtable database
- 🛑 **Stop/Start Control**: Start and stop scraping at any time

## Quick Start

### 1. Install Dependencies
```bash
# Install main dependencies
npm run setup

# Or install separately:
npm install                    # Backend dependencies
npm run client:install         # Frontend dependencies
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
```

### 3. Configure Environment Variables
Edit `.env` file with your settings:

```env
# Twitter Authentication (required)
TWITTER_COOKIE=your_twitter_session_cookie_here

# Discord Integration (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your/webhook/url

# Airtable Integration (optional)
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
```

### 4. Run the Application
```bash
# Development mode (runs both frontend and backend)
npm run dev

# Or run separately:
npm run server:dev    # Backend only
npm run client:dev    # Frontend only

# Production mode
npm run build
npm start
```

### 5. Open in Browser
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## How to Use

1. **Enter Search Term**: Type any word or phrase you want to search for
2. **Configure Options**:
   - Set minimum likes threshold
   - Choose verified accounts only (optional)
3. **Start Scraping**: Click "Start Scraping" button
4. **Monitor Progress**: Watch real-time updates and progress
5. **View Results**: See found tweets with details
6. **Stop Anytime**: Click "Stop" to halt the scraping process

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWITTER_COOKIE` | Twitter session cookie for authentication | ✅ |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for notifications | ❌ |
| `AIRTABLE_API_KEY` | Airtable API key for data storage | ❌ |
| `AIRTABLE_BASE_ID` | Airtable base ID for data storage | ❌ |
| `PORT` | Server port (default: 3001) | ❌ |

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/status` - Get scraper status
- `POST /api/scrape` - Start scraping
- `POST /api/stop` - Stop scraping

## WebSocket Events

- `scrapeProgress` - Progress updates
- `tweetFound` - New tweet found
- `scrapeComplete` - Scraping finished
- `scrapeError` - Error occurred
- `scrapeStopped` - Scraping stopped

## Project Structure

```
twitter-scraper-ui/
├── package.json              # Main package file
├── server/                   # Backend (Node.js + Express)
│   ├── index.js             # Main server file
│   └── scraper.js           # Twitter scraper module
├── client/                   # Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── App.jsx          # Main React component
│       └── index.css        # Styles
├── .env.example             # Environment template
└── README.md               # This file
```

## Development

### Backend Development
```bash
npm run server:dev    # Run backend with nodemon
```

### Frontend Development
```bash
npm run client:dev    # Run frontend with Vite
```

### Building for Production
```bash
npm run build         # Build React app
npm start            # Start production server
```

## Getting Twitter Cookie

1. Open Twitter/X.com in your browser
2. Login to your account
3. Open Developer Tools (F12)
4. Go to Network tab
5. Refresh the page
6. Find any request to x.com
7. Copy the `Cookie` header value
8. Paste it as `TWITTER_COOKIE` in your `.env` file

## Troubleshooting

### Common Issues

1. **"No tweets found"**: Check if Twitter cookie is valid
2. **"Browser failed to launch"**: Install Chrome/Chromium
3. **"Connection failed"**: Check if ports 3000/3001 are available
4. **"Discord/Airtable failed"**: Verify webhook URL and API keys

### Debug Mode
Set `headless: false` in `server/scraper.js` to see browser window.

## Tech Stack

- **Frontend**: React 18, Vite, Lucide React Icons
- **Backend**: Node.js, Express, Socket.io
- **Scraping**: Puppeteer
- **Integrations**: Discord Webhooks, Airtable API
- **Real-time**: WebSocket connections

## License

MIT License - feel free to use this project for your needs!
