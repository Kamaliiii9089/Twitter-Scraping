#!/usr/bin/env node

/**
 * Twitter Scraper Server with React Interface
 * Provides API endpoints for custom Twitter searches with real-time updates
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const TwitterScraper = require('./scraper');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files only if dist folder exists
const fs = require('fs');
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  console.log('⚠️  Client not built yet. Run "npm run build" or "npm run client:dev" first.');
}

// Global scraper instance
let currentScraper = null;

// Socket.io connection
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('📱 Client disconnected:', socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Twitter Scraper API',
    timestamp: new Date().toISOString()
  });
});

// Get current scraper status
app.get('/api/status', (req, res) => {
  res.json({
    isRunning: currentScraper !== null,
    timestamp: new Date().toISOString()
  });
});

// Get search history
app.get('/api/history', (req, res) => {
  const history = TwitterScraper.getSearchHistory();
  res.json({ history });
});

// Clear search history
app.post('/api/clear-history', (req, res) => {
  const { searchTerm } = req.body;
  TwitterScraper.clearSearchHistory(searchTerm);
  res.json({ 
    message: searchTerm ? `History cleared for "${searchTerm}"` : 'All search history cleared' 
  });
});

// Start scraping endpoint
app.post('/api/scrape', async (req, res) => {
  const { searchTerm, minLikes = 3, verifiedOnly = true } = req.body;
  
  if (!searchTerm) {
    return res.status(400).json({ error: 'Search term is required' });
  }
  
  if (currentScraper) {
    return res.status(409).json({ error: 'Scraper is already running' });
  }
  
  try {
    console.log(`🚀 Starting scrape for: "${searchTerm}"`);
    
    // Send immediate response
    res.json({ 
      message: 'Scraping started', 
      searchTerm,
      status: 'running'
    });
    
    // Create scraper instance
    currentScraper = new TwitterScraper({
      searchTerm,
      minLikes,
      verifiedOnly,
      onProgress: (data) => {
        io.emit('scrapeProgress', data);
      },
      onTweet: (tweet) => {
        io.emit('tweetFound', tweet);
      },
      onComplete: (results) => {
        io.emit('scrapeComplete', results);
        currentScraper = null;
      },
      onError: (error) => {
        io.emit('scrapeError', { error: error.message });
        currentScraper = null;
      }
    });
    
    // Start scraping
    await currentScraper.start();
    
  } catch (error) {
    console.error('❌ Scraping error:', error);
    currentScraper = null;
    io.emit('scrapeError', { error: error.message });
  }
});

// Stop scraping endpoint
app.post('/api/stop', async (req, res) => {
  if (!currentScraper) {
    return res.status(404).json({ error: 'No scraper running' });
  }
  
  try {
    await currentScraper.stop();
    currentScraper = null;
    
    io.emit('scrapeStopped');
    res.json({ message: 'Scraper stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/dist/index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend not built',
      message: 'Please run "npm run build" to build the React client first.',
      apis: {
        health: '/api/health',
        status: '/api/status',
        scrape: 'POST /api/scrape',
        stop: 'POST /api/stop'
      }
    });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Twitter Scraper Server running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n📋 Shutting down gracefully...');
  
  if (currentScraper) {
    await currentScraper.stop();
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;
