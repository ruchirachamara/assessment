import { createContext, useCallback, useContext, useState, useRef } from 'react';

const DataContext = createContext();
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const activeRequestRef = useRef(null);

  const buildQueryString = useCallback((params) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, value.toString());
      }
    });
    
    return searchParams.toString();
  }, []);

  const checkForSearch = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/search`);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const processItemsClientSide = useCallback((rawItems, searchParams) => {
    let filteredItems = Array.isArray(rawItems) ? [...rawItems] : [];
    const { q, category, sortBy = 'id', sortOrder = 'asc' } = searchParams;
    
    if (q && q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      filteredItems = filteredItems.filter(item => {
        return [
          item.name,
          item.category,
          item.description,
          item.id?.toString(),
          item.price?.toString()
        ].some(field => 
          field && field.toString().toLowerCase().includes(searchTerm)
        );
      });
    }
    
    if (category) {
      filteredItems = filteredItems.filter(item => 
        item.category && item.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (sortBy && filteredItems.length > 0) {
      filteredItems.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal ? bVal.toLowerCase() : '';
        }
        
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return filteredItems;
  }, []);

  const fetchItems = useCallback(async (searchParams = {}) => {
    let url;
    let processResponse;
    // Cancel any existing request
    if (activeRequestRef.current) {
      activeRequestRef.current.cancelled = true;
    }

    // Create new request tracker
    const requestTracker = { cancelled: false };
    activeRequestRef.current = requestTracker;

    try {
      setLoading(true);
      setError(null);    
      // Check if we should use enhanced backend features
      const hasEnhancedBackend = await checkForSearch();
            
      if (hasEnhancedBackend) {
        const queryString = buildQueryString(searchParams);
        url = `${API_BASE_URL}/api/items${queryString ? `?${queryString}` : ''}`;
        
        processResponse = (response) => {
          setItems(response.items || []);
          setAllItems(response.items || []);
          setPagination(response.pagination || null);
          setSearchMetadata(response.search || null);
        };
      } else {
        // Use legacy backend with client-side processing
        const { q, category, limit = 12, page = 1 } = searchParams;
        const legacyParams = {};
        
        if (q) legacyParams.q = q;
        legacyParams.limit = 1000;        
        const queryString = buildQueryString(legacyParams);
        url = `${API_BASE_URL}/api/items${queryString ? `?${queryString}` : ''}`;
        
        processResponse = (response) => {
          let rawItems = Array.isArray(response) ? response : [];          
          setAllItems(rawItems);
          const filteredItems = processItemsClientSide(rawItems, searchParams);          
          const itemsPerPage = parseInt(limit) || 12;
          const currentPage = parseInt(page) || 1;
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedItems = filteredItems.slice(startIndex, endIndex);          
          setItems(paginatedItems);          
          // Create pagination metadata
          const totalItems = filteredItems.length;
          const totalPages = Math.ceil(totalItems / itemsPerPage);          
          const paginationData = {
            currentPage,
            totalPages,
            totalItems,
            itemsPerPage,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
            nextPage: currentPage < totalPages ? currentPage + 1 : null,
            prevPage: currentPage > 1 ? currentPage - 1 : null
          };
          
          setPagination(paginationData);          
          setSearchMetadata({
            query: q || null,
            category: category || null,
            sortBy: searchParams.sortBy || 'id',
            sortOrder: searchParams.sortOrder || 'asc',
            resultsFound: filteredItems.length
          });
        };
      }
      
      const res = await fetch(url);
      
      // Check if request was cancelled before processing response
      if (requestTracker.cancelled) {
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const response = await res.json();
      
      // Final check before state update
      if (!requestTracker.cancelled) {
        processResponse(response);
      }
      
      return response;
    } catch (err) {
      // Only update error state if request wasn't cancelled
      if (!requestTracker.cancelled) {
        setError(err.message);
      }
      throw err;
    } finally {
      // Only update loading state if request wasn't cancelled
      if (!requestTracker.cancelled) {
        setLoading(false);
      }
    }
  }, [buildQueryString, checkForSearch, processItemsClientSide]);

  const fetchSearchSuggestions = useCallback(async (query) => {
    try {
      if (!query || query.trim().length < 2) {
        return { suggestions: [] };
      }
      
      const url = `${API_BASE_URL}/api/items/search/suggestions?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      
      if (res.ok) {
        return await res.json();
      } else {
        // Fallback: generate suggestions from all items
        const searchTerm = query.toLowerCase();
        const suggestions = new Set();
        
        allItems.forEach(item => {
          if (item.name && item.name.toLowerCase().includes(searchTerm)) {
            suggestions.add(item.name);
          }
          if (item.category && item.category.toLowerCase().includes(searchTerm)) {
            suggestions.add(item.category);
          }
        });
        
        return { 
          suggestions: Array.from(suggestions).slice(0, 10),
          query 
        };
      }
    } catch (err) {
      return { suggestions: [] };
    }
  }, [allItems]);

  const fetchCategories = useCallback(async () => {
    try {
      let itemsToProcess = allItems;
      
      if (itemsToProcess.length === 0) {
        const itemsRes = await fetch(`${API_BASE_URL}/api/items?limit=1000`);
        if (itemsRes.ok) {
          itemsToProcess = await itemsRes.json();
          setAllItems(itemsToProcess);
        }
      }
      
      const extractedCategories = [...new Set(
        itemsToProcess
          .map(item => item.category)
          .filter(category => category && category.trim() !== '')
      )].sort();
      
      setCategories(extractedCategories);
      return { categories: extractedCategories };
    } catch (err) {
      setCategories([]);
    }
  }, [allItems]);

  const fetchItemsSimple = useCallback(async () => {
    return fetchItems({ limit: 12, page: 1 });
  }, [fetchItems]);

  const resetItems = useCallback(() => {
    setItems([]);
    setAllItems([]);
    setPagination(null);
    setSearchMetadata(null);
    setError(null);
  }, []);

  // Cleanup function to cancel active requests
  const cleanup = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.cancelled = true;
      activeRequestRef.current = null;
    }
  }, []);

  const contextValue = {
    items,
    allItems,
    pagination,
    searchMetadata,
    categories,
    loading,
    error,
    fetchItems,
    fetchItemsSimple,
    fetchSearchSuggestions,
    fetchCategories,
    resetItems,
    cleanup
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};