const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

// Utility to read data asynchronously (fixed: non-blocking async operation)
async function readData() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    // Handle file reading errors gracefully
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

// Enhanced search function with multiple criteria
function searchItems(items, query) {
  if (!query || query.trim() === '') {
    return items;
  }

  const searchTerm = query.toLowerCase().trim();
  
  return items.filter(item => {
    const searchableFields = [
      item.name,
      item.category,
      item.description,
      item.id?.toString(),
      item.price?.toString()
    ];

    return searchableFields.some(field => 
      field && field.toString().toLowerCase().includes(searchTerm)
    );
  });
}

function sortItems(items, sortBy = 'id', sortOrder = 'asc') {
  const validSortFields = ['id', 'name', 'price', 'category', 'createdAt'];
  const field = validSortFields.includes(sortBy) ? sortBy : 'id';
  const order = sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc';

  return [...items].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal ? bVal.toLowerCase() : '';
    }

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

function paginateItems(items, page = 1, limit = 10) {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;  
  const paginatedItems = items.slice(startIndex, endIndex);
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limitNum);
  
  return {
    items: paginatedItems,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null
    }
  };
}

router.get('/', async (req, res, next) => {
  try {
    // Use async readData instead of blocking readFileSync
    const data = await readData();    
    const { 
      q: searchQuery, 
      page = 1, 
      limit = 10, 
      sortBy = 'id', 
      sortOrder = 'asc',
      category 
    } = req.query;
    let results = data;

    if (category && category.trim() !== '') {
      results = results.filter(item => 
        item.category && item.category.toLowerCase() === category.toLowerCase().trim()
      );
    }

    if (searchQuery) {
      results = searchItems(results, searchQuery);
    }

    results = sortItems(results, sortBy, sortOrder);
    const paginatedResult = paginateItems(results, page, limit);

    // Search metadata to response
    const response = {
      ...paginatedResult,
      search: {
        query: searchQuery || null,
        category: category || null,
        sortBy,
        sortOrder,
        resultsFound: results.length
      }
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/items/categories - Get all unique categories
 * 
 * Returns a list of all unique categories found in the items collection.
 * Categories are extracted from existing items and returned in alphabetical order.
 * 
 */
router.get('/categories', async (_, res, next) => {
  try {
    const data = await readData();
    
    const categories = [...new Set(
      data
        .map(item => item.category)
        .filter(category => category && category.trim() !== '')
    )].sort();

    res.json({ 
      categories,
      total: categories.length 
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/items/:id - Get a specific item by ID
 * 
 * Retrieves a single item from the collection using its unique identifier.
 * Returns detailed information about the requested item.
 */
router.get('/:id', async (req, res, next) => {
  try {
    // Use async readData instead of blocking readFileSync
    const data = await readData();
    const itemId = parseInt(req.params.id);
    
    if (isNaN(itemId)) {
      const err = new Error('Invalid item ID');
      err.status = 400;
      throw err;
    }
    
    const item = data.find(i => i.id === itemId);
    if (!item) {
      const err = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;