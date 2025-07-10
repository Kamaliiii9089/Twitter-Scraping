import React, { useState, useEffect } from 'react';
import { Search, Play, Square, Twitter, Heart, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [minLikes, setMinLikes] = useState(3);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [isScrapingActive, setIsScrapingActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [tweets, setTweets] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('scrapeProgress', (data) => {
      setStatus(data.status);
      if (data.current && data.total) {
        setProgress({ current: data.current, total: data.total });
      }
    });

    newSocket.on('tweetFound', (tweet) => {
      setTweets(prev => [...prev, tweet]);
    });

    newSocket.on('scrapeComplete', (data) => {
      setResults(data);
      setIsScrapingActive(false);
      setStatus('completed');
    });

    newSocket.on('scrapeError', (data) => {
      setError(data.error);
      setIsScrapingActive(false);
      setStatus('error');
    });

    newSocket.on('scrapeStopped', () => {
      setIsScrapingActive(false);
      setStatus('stopped');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleStartScraping = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setError(null);
    setTweets([]);
    setResults(null);
    setProgress({ current: 0, total: 0 });
    setIsScrapingActive(true);
    setStatus('starting');

    try {
      await axios.post('/api/scrape', {
        searchTerm: searchTerm.trim(),
        minLikes,
        verifiedOnly
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start scraping');
      setIsScrapingActive(false);
      setStatus('error');
    }
  };

  const handleStopScraping = async () => {
    try {
      await axios.post('/api/stop');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to stop scraping');
    }
  };

  const clearSearchHistory = async (searchTerm) => {
    try {
      await axios.post('/api/clear-history', { searchTerm });
      setTweets([]);
      setResults(null);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear history');
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getProgressPercentage = () => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>🐦 Twitter Scraper</h1>
        <p>Enter any word or phrase to search and scrape Twitter/X.com</p>
      </div>

      {/* Search Form */}
      <div className="search-card">
        <form className="search-form" onSubmit={(e) => { e.preventDefault(); handleStartScraping(); }}>
          <div className="input-group">
            <label htmlFor="search-term">
              <Search size={16} style={{ display: 'inline', marginRight: '8px' }} />
              Search Term
            </label>
            <input
              id="search-term"
              type="text"
              className="search-input"
              placeholder="Enter word or phrase to search for..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isScrapingActive}
            />
          </div>

          <div className="options-row">
            <div className="input-group">
              <label htmlFor="min-likes">Minimum Likes</label>
              <input
                id="min-likes"
                type="number"
                className="number-input"
                min="0"
                value={minLikes}
                onChange={(e) => setMinLikes(parseInt(e.target.value) || 0)}
                disabled={isScrapingActive}
              />
            </div>

            <div className="checkbox-group">
              <input
                id="verified-only"
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                disabled={isScrapingActive}
              />
              <label htmlFor="verified-only">Verified accounts only</label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="search-button"
              disabled={isScrapingActive || !searchTerm.trim()}
            >
              <Play size={20} />
              {isScrapingActive ? 'Scraping...' : 'Start Scraping'}
            </button>

            {isScrapingActive && (
              <button
                type="button"
                className="search-button stop-button"
                onClick={handleStopScraping}
              >
                <Square size={20} />
                Stop
              </button>
            )}

            {!isScrapingActive && searchTerm.trim() && (
              <button
                type="button"
                className="search-button"
                style={{ 
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  fontSize: '14px',
                  padding: '12px 20px'
                }}
                onClick={() => clearSearchHistory(searchTerm.trim())}
              >
                Clear History for "{searchTerm}"
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span className="error-text">{error}</span>
          </div>
        </div>
      )}

      {/* Status Card */}
      {(isScrapingActive || status !== 'idle') && (
        <div className="status-card">
          <div className="status-header">
            <div className={`status-dot ${isScrapingActive ? '' : 'idle'}`}></div>
            <h3>Status: {status}</h3>
          </div>
          
          {isScrapingActive && progress.total > 0 && (
            <>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
              <p>Processing tweet {progress.current} of {progress.total} ({getProgressPercentage()}%)</p>
            </>
          )}
        </div>
      )}

      {/* Results */}
      {(tweets.length > 0 || results) && (
        <div className="results-card">
          <div className="results-header">
            <h2>
              <BarChart3 size={24} style={{ display: 'inline', marginRight: '10px' }} />
              Results
            </h2>
            {results && (
              <span>Search: "{results.searchTerm}"</span>
            )}
          </div>

          {/* Stats */}
          {results && (
            <div className="results-stats">
              <div className="stat-item">
                <div className="stat-number">{results.totalFound}</div>
                <div className="stat-label">Found</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{results.newTweetsCount || results.totalFound}</div>
                <div className="stat-label">New Tweets</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{results.filteredCount}</div>
                <div className="stat-label">High Quality</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{results.discordSent}</div>
                <div className="stat-label">Discord Sent</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{results.airtableSaved}</div>
                <div className="stat-label">Airtable Saved</div>
              </div>
              {results.searchHistory && (
                <div className="stat-item">
                  <div className="stat-number">#{results.searchHistory.searchCount}</div>
                  <div className="stat-label">Search Count</div>
                </div>
              )}
            </div>
          )}

          {/* Tweets List */}
          <div className="tweets-list">
            {tweets.map((tweet, index) => (
              <div key={tweet.id || index} className="tweet-card">
                <div className="tweet-header">
                  <a 
                    href={tweet.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="tweet-username"
                  >
                    @{tweet.username}
                  </a>
                  {tweet.isVerified && (
                    <CheckCircle size={18} className="verified-badge" />
                  )}
                </div>
                
                <div className="tweet-text">
                  {tweet.text}
                </div>
                
                <div className="tweet-footer">
                  <div className="tweet-likes">
                    <Heart size={16} />
                    {formatNumber(tweet.likes)} likes
                  </div>
                  <div>
                    {new Date(tweet.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tweets.length === 0 && results && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <Twitter size={48} style={{ opacity: 0.5, marginBottom: '15px' }} />
              <p>No tweets found matching your criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
