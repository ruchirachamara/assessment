const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../data/items.json');

let statsCache = {
  data: null,
  timestamp: 0,
  fileModTime: 0
};
let fileWatcher = null;
const CACHE_TTL = 5 * 60 * 1000;

// Initialize file watcher (with error handling for missing file)
function initFileWatcher() {
  try {
    // Clean up existing watcher if it exists
    if (fileWatcher) {
      fileWatcher.close();
    }
    
    fileWatcher = fs.watch(DATA_PATH, (eventType) => {
      if (eventType === 'change') {
        console.log('Data file changed, invalidating stats cache');
        invalidateCache();
      }
    });
    
    console.log('File watcher initialized for stats cache');
  } catch (error) {
    console.warn('Could not initialize file watcher for stats:', error.message);
  }
}

initFileWatcher();

// Gracefully close file watcher on process termination
process.on('SIGTERM', () => {
  if (fileWatcher) {
    fileWatcher.close();
  }
});

process.on('SIGINT', () => {
  if (fileWatcher) {
    fileWatcher.close();
  }
});

// Function to invalidate the stats cache
function invalidateCache() {
  statsCache.data = null;
  statsCache.timestamp = 0;
  statsCache.fileModTime = 0;
}

// Function to check if cache is still valid
function isCacheValid() {
  const now = Date.now();
  
  // Check if cache exists and is within TTL
  if (!statsCache.data || (now - statsCache.timestamp > CACHE_TTL)) {
    return false;
  }
  
  return true;
}

// Function to get file modification time
async function getFileModTime() {
  try {
    const stats = await fs.stat(DATA_PATH);
    return stats.mtime.getTime();
  } catch (error) {
    return 0;
  }
}

// Function to calculate stats (extracted for reusability)
function calculateStats(items) {
  // Intentional heavy CPU calculation
  const total = items.length;
  
  // Handle division by zero case
  if (total === 0) {
    return {
      total: 0,
      averagePrice: 0
    };
  }
  
  // Calculate average price with better precision
  const totalPrice = items.reduce((acc, cur) => {
    // Ensure price is a number, default to 0 if invalid
    const price = typeof cur.price === 'number' ? cur.price : 0;
    return acc + price;
  }, 0);
  
  const averagePrice = Math.round((totalPrice / total) * 100) / 100;
  
  return {
    total,
    averagePrice
  };
}

// Function to load and cache stats
async function loadAndCacheStats() {
  try {
    // Check file modification time
    const currentFileModTime = await getFileModTime();
    
    // If file hasn't been modified since last cache, return cached data
    if (statsCache.data && statsCache.fileModTime === currentFileModTime && isCacheValid()) {
      return statsCache.data;
    }
    
    // Read and parse data file
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    const items = JSON.parse(raw);
    
    // Calculate new stats
    const stats = calculateStats(items);
    
    // Update cache
    statsCache.data = stats;
    statsCache.timestamp = Date.now();
    statsCache.fileModTime = currentFileModTime;
    
    console.log('Stats cache updated');
    return stats;
    
  } catch (error) {
    // Handle file not found or parsing errors
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return empty stats
      const emptyStats = { total: 0, averagePrice: 0 };
      statsCache.data = emptyStats;
      statsCache.timestamp = Date.now();
      return emptyStats;
    }
    throw error;
  }
}

// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    // Check if we can use cached data
    if (isCacheValid()) {
      console.log('Serving stats from cache');
      return res.json(statsCache.data);
    }
    
    // Load fresh data and update cache
    console.log('Loading fresh stats data');
    const stats = await loadAndCacheStats();
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Additional endpoint to manually invalidate cache (useful for debugging)
router.delete('/cache', (req, res) => {
  invalidateCache();
  console.log('Stats cache manually invalidated');
  res.json({ message: 'Cache invalidated successfully' });
});

// Additional endpoint to get cache status (useful for debugging)
router.get('/cache/status', (req, res) => {
  const now = Date.now();
  const cacheAge = statsCache.timestamp ? now - statsCache.timestamp : 0;
  
  res.json({
    cached: !!statsCache.data,
    cacheAge: cacheAge,
    cacheValid: isCacheValid(),
    lastUpdated: statsCache.timestamp ? new Date(statsCache.timestamp).toISOString() : null
  });
});

module.exports = router;