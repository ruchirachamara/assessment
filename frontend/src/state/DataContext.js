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
      const response = await fetch(`${API_BASE_URL}/api/items`);
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
      
      // Check if we have an enhanced backend
      const hasEnhancedBackend = await checkForSearch();
            
      if (hasEnhancedBackend) {
        // Try enhanced backend first
        try {
          const queryString = buildQueryString(searchParams);
          const url = `${API_BASE_URL}/api/items${queryString ? `?${queryString}` : ''}`;
          
          const res = await fetch(url);
          
          if (requestTracker.cancelled) {
            return;
          }
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const response = await res.json();
          
          if (!requestTracker.cancelled) {
            // Check if response has enhanced structure
            if (response.items && response.pagination) {
              setItems(response.items || []);
              setAllItems(response.items || []);
              setPagination(response.pagination || null);
              setSearchMetadata(response.search || null);
            } else {
              // Fallback to simple array response
              throw new Error('Enhanced backend not available');
            }
          }
          
          return response;
        } catch (enhancedError) {
          // If enhanced backend fails, fall back to simple processing
          console.log('Enhanced backend failed, falling back to simple mode:', enhancedError.message);
        }
      }
      
      // Fallback: Use simple backend with client-side processing
      const { q, category, limit = 12, page = 1 } = searchParams;
      const url = `${API_BASE_URL}/api/items`;
      const res = await fetch(url);
      
      if (requestTracker.cancelled) {
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const response = await res.json();
      
      if (!requestTracker.cancelled) {
        let rawItems = Array.isArray(response) ? response : 
                      response.items ? response.items : 
                      response.data ? response.data : [];
        
        setAllItems(rawItems);
        
        // Process items client-side
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

  const fetchCategories = useCallback(async () => {
    try {
      let itemsToProcess = allItems;
      
      if (itemsToProcess.length === 0) {
        try {
          const itemsRes = await fetch(`${API_BASE_URL}/api/items`);
          if (itemsRes.ok) {
            const response = await itemsRes.json();
            itemsToProcess = Array.isArray(response) ? response : 
                            response.items ? response.items : 
                            response.data ? response.data : [];
            setAllItems(itemsToProcess);
          }
        } catch (error) {
          console.log('Could not fetch items for categories:', error.message);
          return { categories: [] };
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
      return { categories: [] };
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