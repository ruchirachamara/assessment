const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const itemsRouter = require('../src/routes/items');

// Mock fs.promises to avoid actual file system operations during tests
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }
}));

describe('Items Router', () => {
  let app;
  
  // Sample test data
  const mockItems = [
    { id: 1, name: 'Test Item 1', price: 10.99, category: 'electronics' },
    { id: 2, name: 'Test Item 2', price: 25.50, category: 'books' },
    { id: 3, name: 'Another Item', price: 5.00, category: 'electronics' }
  ];

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/items', itemsRouter);
    
    // Add error handler middleware
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error' 
      });
    });
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('GET /api/items', () => {
    describe('Happy Path', () => {
      it('should return all items with pagination metadata when no query parameters', async () => {
        // Mock successful file read
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items')
          .expect(200);
        
        // Check the enhanced response structure
        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('pagination');
        expect(response.body).toHaveProperty('search');      
        expect(response.body.items).toEqual(mockItems);
        expect(response.body.pagination.totalItems).toBe(3);
        expect(response.body.search.resultsFound).toBe(3);
        expect(fs.readFile).toHaveBeenCalledTimes(1);
      });

      it('should return filtered items when search query provided', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?q=test')
          .expect(200);
        
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items[0].name).toBe('Test Item 1');
        expect(response.body.items[1].name).toBe('Test Item 2');
        expect(response.body.search.query).toBe('test');
        expect(response.body.search.resultsFound).toBe(2);
      });

      it('should return case-insensitive filtered results', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?q=TEST')
          .expect(200);
        
        expect(response.body.items).toHaveLength(2);
        expect(response.body.search.query).toBe('TEST');
      });

      it('should limit results when limit parameter provided', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?limit=2')
          .expect(200);
        
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items[0].id).toBe(1);
        expect(response.body.items[1].id).toBe(2);
        expect(response.body.pagination.itemsPerPage).toBe(2);
        expect(response.body.pagination.hasNextPage).toBe(true);
      });

      it('should apply both search and limit parameters', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?q=item&limit=1')
          .expect(200);
        
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].name).toBe('Test Item 1');
        expect(response.body.search.query).toBe('item');
        expect(response.body.pagination.itemsPerPage).toBe(1);
      });

      it('should return empty items array when file is empty', async () => {
        fs.readFile.mockResolvedValue('[]');
        
        const response = await request(app)
          .get('/api/items')
          .expect(200);
        
        expect(response.body.items).toEqual([]);
        expect(response.body.pagination.totalItems).toBe(0);
        expect(response.body.search.resultsFound).toBe(0);
      });

      it('should ignore invalid limit values and use default', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?limit=0')
          .expect(200);
        
        // Invalid limit (0) should be ignored and default limit should be used
        // Since we have 3 items and default limit is 10, all 3 items should be returned
        expect(response.body.items).toHaveLength(3);
        expect(response.body.pagination.itemsPerPage).toBe(10);
        expect(response.body.pagination.totalItems).toBe(3);
        expect(response.body.pagination.hasNextPage).toBe(false);
      });

      it('should handle category filtering', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?category=electronics')
          .expect(200);
        
        expect(response.body.items).toHaveLength(2);
        expect(response.body.items.every(item => item.category === 'electronics')).toBe(true);
        expect(response.body.search.category).toBe('electronics');
      });

      it('should handle sorting by name ascending', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?sortBy=name&sortOrder=asc')
          .expect(200);
        
        expect(response.body.items[0].name).toBe('Another Item');
        expect(response.body.search.sortBy).toBe('name');
        expect(response.body.search.sortOrder).toBe('asc');
      });

      it('should handle sorting by price descending', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items?sortBy=price&sortOrder=desc')
          .expect(200);
        
        expect(response.body.items[0].price).toBe(25.50);
        expect(response.body.search.sortBy).toBe('price');
        expect(response.body.search.sortOrder).toBe('desc');
      });
    });

    describe('Error Cases', () => {
      it('should handle file not found error', async () => {
        const error = new Error('File not found');
        error.code = 'ENOENT';
        fs.readFile.mockRejectedValue(error);
        
        const response = await request(app)
          .get('/api/items')
          .expect(200);
        
        expect(response.body.items).toEqual([]);
        expect(response.body.pagination.totalItems).toBe(0);
      });

      it('should handle file read permission error', async () => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        fs.readFile.mockRejectedValue(error);
        
        await request(app)
          .get('/api/items')
          .expect(500);
      });

      it('should handle invalid JSON in data file', async () => {
        fs.readFile.mockResolvedValue('invalid json');
        
        await request(app)
          .get('/api/items')
          .expect(500);
      });
    });
  });

  describe('GET /api/items/search/suggestions', () => {
    it('should return search suggestions', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
      
      const response = await request(app)
        .get('/api/items/search/suggestions?q=test')
        .expect(200);
      
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('query', 'test');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    it('should return empty suggestions for short queries', async () => {
      const response = await request(app)
        .get('/api/items/search/suggestions?q=t')
        .expect(200);
      
      expect(response.body.suggestions).toEqual([]);
    });
  });

  describe('GET /api/items/categories', () => {
    it('should return all unique categories', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
      
      const response = await request(app)
        .get('/api/items/categories')
        .expect(200);
      
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('total');
      expect(response.body.categories).toContain('electronics');
      expect(response.body.categories).toContain('books');
      expect(response.body.total).toBe(2);
    });
  });

  describe('GET /api/items/:id', () => {
    describe('Happy Path', () => {
      it('should return specific item by ID', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items/2')
          .expect(200);
        
        expect(response.body).toEqual(mockItems[1]);
      });

      it('should return first item when ID is 1', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items/1')
          .expect(200);
        
        expect(response.body.id).toBe(1);
        expect(response.body.name).toBe('Test Item 1');
      });
    });

    describe('Error Cases', () => {
      it('should return 404 when item not found', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items/999')
          .expect(404);
        
        expect(response.body.error).toBe('Item not found');
      });

      it('should return 400 for invalid ID format', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items/invalid')
          .expect(400);
        
        expect(response.body.error).toBe('Invalid item ID');
      });

      it('should return 400 for non-numeric ID', async () => {
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        
        const response = await request(app)
          .get('/api/items/abc')
          .expect(400);
        
        expect(response.body.error).toBe('Invalid item ID');
      });

      it('should handle file read error when getting specific item', async () => {
        const error = new Error('File read error');
        fs.readFile.mockRejectedValue(error);
        
        await request(app)
          .get('/api/items/1')
          .expect(500);
      });

      it('should return 404 when file is empty', async () => {
        fs.readFile.mockResolvedValue('[]');
        
        const response = await request(app)
          .get('/api/items/1')
          .expect(404);
        
        expect(response.body.error).toBe('Item not found');
      });
    });
  });

  describe('POST /api/items', () => {
    describe('Happy Path', () => {
      it('should create new item successfully', async () => {
        const newItem = { name: 'New Item', price: 15.99, category: 'test' };
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        fs.writeFile.mockResolvedValue();
        
        // Mock Date.now to have predictable ID
        const mockTimestamp = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
        
        const response = await request(app)
          .post('/api/items')
          .send(newItem)
          .expect(201);
        
        // Check that the response includes the new item with ID and createdAt
        expect(response.body).toMatchObject({
          ...newItem,
          id: mockTimestamp
        });
        expect(response.body).toHaveProperty('createdAt');
        expect(typeof response.body.createdAt).toBe('string');        
        expect(fs.readFile).toHaveBeenCalledTimes(1);
        expect(fs.writeFile).toHaveBeenCalledTimes(1);        
        // Verify the data written to file includes new item
        const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
        expect(writtenData).toHaveLength(4);
        expect(writtenData[3]).toMatchObject({ ...newItem, id: mockTimestamp });
        expect(writtenData[3]).toHaveProperty('createdAt');
        
        Date.now.mockRestore();
      });

      it('should create item when data file is empty', async () => {
        const newItem = { name: 'First Item', price: 10.00 };
        fs.readFile.mockResolvedValue('[]');
        fs.writeFile.mockResolvedValue();
        
        const mockTimestamp = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
        
        const response = await request(app)
          .post('/api/items')
          .send(newItem)
          .expect(201);
        
        expect(response.body.id).toBe(mockTimestamp);
        expect(response.body).toHaveProperty('createdAt');
        
        const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
        expect(writtenData).toHaveLength(1);
        
        Date.now.mockRestore();
      });

      it('should handle file not found and create new file', async () => {
        const newItem = { name: 'First Item', price: 20.00 };
        const error = new Error('File not found');
        error.code = 'ENOENT';
        fs.readFile.mockRejectedValue(error);
        fs.writeFile.mockResolvedValue();
        
        const mockTimestamp = 1234567890;
        jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
        
        const response = await request(app)
          .post('/api/items')
          .send(newItem)
          .expect(201);
        
        expect(response.body.id).toBe(mockTimestamp);
        expect(response.body).toHaveProperty('createdAt');
        
        Date.now.mockRestore();
      });

      it('should validate and clean item data', async () => {
        const newItem = { 
          name: '  Test Item  ', 
          price: '25.99', 
          category: '  electronics  ',
          description: '  Test description  '
        };
        fs.readFile.mockResolvedValue('[]');
        fs.writeFile.mockResolvedValue();
        
        const response = await request(app)
          .post('/api/items')
          .send(newItem)
          .expect(201);
        
        expect(response.body.name).toBe('Test Item');
        expect(response.body.price).toBe(25.99);
        expect(response.body.category).toBe('electronics');
        expect(response.body.description).toBe('Test description');
      });
    });

    describe('Error Cases', () => {
      it('should return 400 when name is missing', async () => {
        const invalidItem = { price: 15.99, category: 'test' };        
        const response = await request(app)
          .post('/api/items')
          .send(invalidItem)
          .expect(400);
        
        expect(response.body.error).toBe('Item name is required');
        expect(fs.readFile).not.toHaveBeenCalled();
        expect(fs.writeFile).not.toHaveBeenCalled();
      });

      it('should return 400 when name is empty string', async () => {
        const invalidItem = { name: '', price: 15.99 };        
        const response = await request(app)
          .post('/api/items')
          .send(invalidItem)
          .expect(400);
        
        expect(response.body.error).toBe('Item name is required');
      });

      it('should return 400 when name is null', async () => {
        const invalidItem = { name: null, price: 15.99 };        
        const response = await request(app)
          .post('/api/items')
          .send(invalidItem)
          .expect(400);
        
        expect(response.body.error).toBe('Item name is required');
      });

      it('should return 400 for invalid price', async () => {
        const invalidItem = { name: 'Test Item', price: -10 };        
        const response = await request(app)
          .post('/api/items')
          .send(invalidItem)
          .expect(400);
        
        expect(response.body.error).toBe('Price must be a valid positive number');
      });

      it('should handle file read error during creation', async () => {
        const newItem = { name: 'New Item', price: 15.99 };
        const error = new Error('Permission denied');
        fs.readFile.mockRejectedValue(error);
        
        await request(app)
          .post('/api/items')
          .send(newItem)
          .expect(500);
      });

      it('should handle file write error', async () => {
        const newItem = { name: 'New Item', price: 15.99 };
        fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
        fs.writeFile.mockRejectedValue(new Error('Disk full'));
        
        await request(app)
          .post('/api/items')
          .send(newItem)
          .expect(500);
      });

      it('should handle malformed JSON request body', async () => {
        await request(app)
          .post('/api/items')
          .send('invalid json')
          .set('Content-Type', 'application/json')
          .expect(400);
      });

      it('should handle empty request body', async () => {
        const response = await request(app)
          .post('/api/items')
          .send({})
          .expect(400);
        
        expect(response.body.error).toBe('Item name is required');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should create item and then retrieve it', async () => {
      const newItem = { name: 'Integration Test Item', price: 99.99 };
      
      fs.readFile.mockResolvedValueOnce(JSON.stringify(mockItems));
      fs.writeFile.mockResolvedValue();
      
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      
      const createResponse = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);
      
      const updatedItems = [...mockItems, { 
        ...newItem, 
        id: mockTimestamp,
        createdAt: createResponse.body.createdAt 
      }];
      fs.readFile.mockResolvedValueOnce(JSON.stringify(updatedItems));
      
      const getResponse = await request(app)
        .get(`/api/items/${mockTimestamp}`)
        .expect(200);
      
      expect(getResponse.body).toEqual(createResponse.body);
      
      Date.now.mockRestore();
    });

    it('should search and paginate through created items', async () => {
      const allItems = [
        ...mockItems,
        { id: 4, name: 'Test Item 4', price: 30.00, category: 'books' },
        { id: 5, name: 'Test Item 5', price: 35.00, category: 'electronics' }
      ];
      
      fs.readFile.mockResolvedValue(JSON.stringify(allItems));
      
      const response = await request(app)
        .get('/api/items?q=test&limit=2&page=1')
        .expect(200);
      
      expect(response.body.items).toHaveLength(2);
      expect(response.body.pagination.totalItems).toBe(4);
      expect(response.body.pagination.totalPages).toBe(2);
      expect(response.body.pagination.hasNextPage).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large item arrays', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        price: Math.random() * 100
      }));
      
      fs.readFile.mockResolvedValue(JSON.stringify(largeArray));
      
      const response = await request(app)
        .get('/api/items?limit=10')
        .expect(200);
      
      expect(response.body.items).toHaveLength(10);
      expect(response.body.pagination.totalItems).toBe(10000);
      expect(response.body.pagination.totalPages).toBe(1000);
    });

    it('should handle special characters in search query', async () => {
      const specialItems = [
        { id: 1, name: 'Item with "quotes"', price: 10 },
        { id: 2, name: 'Item with & symbols', price: 20 }
      ];
      
      fs.readFile.mockResolvedValue(JSON.stringify(specialItems));
      
      const response = await request(app)
        .get('/api/items?q="quotes"')
        .expect(200);
      
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe('Item with "quotes"');
    });

    it('should handle maximum limit constraint', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
      
      const response = await request(app)
        .get('/api/items?limit=200')
        .expect(200);
      
      expect(response.body.pagination.itemsPerPage).toBeLessThanOrEqual(100);
    });

    it('should handle Unicode characters in item names', async () => {
      const unicodeItems = [
        { id: 1, name: 'Café ☕', price: 5.99, category: 'food' },
        { id: 2, name: '🚀 Rocket Ship', price: 999.99, category: 'toys' }
      ];
      
      fs.readFile.mockResolvedValue(JSON.stringify(unicodeItems));
      
      const response = await request(app)
        .get('/api/items?q=café')
        .expect(200);
      
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe('Café ☕');
    });
  });
});