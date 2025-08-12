import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import _ from 'lodash';
import { useSearchParams, Link } from 'react-router-dom';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import { useData } from '../state/DataContext';
import Pagination from '../components/Pagination';
import CategoryFilter from '../components/CategoryFilter';
import Search from '../components/Search';
import ViewModeToggle from '../components/ViewModeToggle';

const Items = () => {
  const { 
    items, 
    pagination, 
    searchMetadata, 
    categories,
    loading, 
    error, 
    fetchItems,
    fetchItemsSimple,
    fetchCategories
  } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [displayedSearchQuery, setDisplayedSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'id');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'grid');
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const isMountedRef = useRef(true);
  const gridRef = useRef(null);

  const gridConfig = useMemo(() => {
    const containerWidth = containerDimensions.width;
    const minItemWidth = viewMode === 'grid' ? 280 : containerWidth;
    const itemHeight = viewMode === 'grid' ? 200 : 80;
    const columnGap = 16;
    const rowGap = 16;
    
    if (viewMode === 'list') {
      return {
        columnCount: 1,
        columnWidth: containerWidth,
        rowHeight: itemHeight,
        itemsPerRow: 1
      };
    }
    
    const availableWidth = containerWidth - 32;
    const columnsCount = Math.max(1, Math.floor((availableWidth + columnGap) / (minItemWidth + columnGap)));
    const columnWidth = Math.floor((availableWidth - (columnsCount - 1) * columnGap) / columnsCount);
    
    return {
      columnCount: columnsCount,
      columnWidth: columnWidth,
      rowHeight: itemHeight + rowGap,
      itemsPerRow: columnsCount
    };
  }, [containerDimensions.width, viewMode]);

  const rowCount = Math.ceil(items.length / gridConfig.itemsPerRow);

  const buildSearchParams = useCallback(() => {
    const params = {
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 12,
      sortBy,
      sortOrder
    };

    if (searchQuery.trim() && searchQuery.trim().length >= 3) {
      params.q = searchQuery.trim();
    }

    if (selectedCategory) {
      params.category = selectedCategory;
    }

    return params;
  }, [searchParams, searchQuery, selectedCategory, sortBy, sortOrder]);

  const shouldLoadItems = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    return trimmedQuery.length === 0 || trimmedQuery.length >= 3;
  }, [searchQuery]);

  const updateSearchParams = useCallback((newParams) => {
    const currentParams = Object.fromEntries(searchParams);
    const updatedParams = { ...currentParams, ...newParams };
    
    Object.keys(updatedParams).forEach(key => {
      if (!updatedParams[key] || updatedParams[key] === '') {
        delete updatedParams[key];
      }
    });

    setSearchParams(updatedParams);
  }, [searchParams, setSearchParams]);

  const loadItems = useCallback(async () => {
    if (!isMountedRef.current || !shouldLoadItems) return;

    try {
      const params = buildSearchParams();
      await fetchItems(params);
    } catch (error) {
      if (isMountedRef.current) {        
        try {
          await fetchItemsSimple();
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
        }
      }
    }
  }, [buildSearchParams, fetchItems, fetchItemsSimple, shouldLoadItems]);

  const performSearch = useCallback((query) => {
    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    
    if (trimmedQuery.length >= 3 || trimmedQuery.length === 0) {
      updateSearchParams({ q: trimmedQuery || undefined, page: 1 });
    }
  }, [updateSearchParams]);

  // Create debounced search function
  const debouncedSearch = useMemo(
    () => _.debounce(performSearch, 300),
    [performSearch]
  );

  const handleSearchInputChange = useCallback((query) => {
    setDisplayedSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const handleSearchSubmit = useCallback((query) => {
    // Cancel any pending debounced calls
    debouncedSearch.cancel();
    performSearch(query);
  }, [debouncedSearch, performSearch]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    updateSearchParams({ category, page: 1 });
  }, [updateSearchParams]);

  const handleSortChange = useCallback((newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    updateSearchParams({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [updateSearchParams]);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    updateSearchParams({ view: mode });
    setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollTo({ scrollTop: 0, scrollLeft: 0 });
      }
    }, 100);
  }, [updateSearchParams]);

  const handlePageChange = useCallback((page) => {
    updateSearchParams({ page });
    // Scroll to top when page changes
    setTimeout(() => {
      if (gridRef.current) {
        gridRef.current.scrollTo({ scrollTop: 0, scrollLeft: 0 });
      }
    }, 100);
  }, [updateSearchParams]);

  const handleLimitChange = useCallback((limit) => {
    updateSearchParams({ limit, page: 1 });
  }, [updateSearchParams]);

  const clearFilters = useCallback(() => {
    debouncedSearch.cancel();
    setSearchQuery('');
    setDisplayedSearchQuery('');
    setSelectedCategory('');
    setSortBy('id');
    setSortOrder('asc');
    setSearchParams({});
  }, [setSearchParams, debouncedSearch]);

  const ItemRenderer = useCallback(({ columnIndex, rowIndex, style }) => {
    const itemIndex = rowIndex * gridConfig.itemsPerRow + columnIndex;
    const item = items[itemIndex];

    if (!item) {
      return <div style={style} />;
    }

    const itemStyle = {
      ...style,
      padding: '8px',
      boxSizing: 'border-box'
    };

    return (
      <div style={itemStyle}>
        <Link 
          to={`/items/${item.id}`}
          className={`block h-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md no-underline text-inherit ${
            viewMode === 'list' 
              ? 'flex flex-row gap-4 items-center' 
              : 'flex flex-col gap-2'
          }`}
        >
          {viewMode === 'list' ? (
            <>
              <div className="flex-1">
                <h3 className="m-0 mb-1 text-blue-600 text-base font-semibold">
                  {item.name}
                </h3>
                <div className="text-xs text-gray-600">
                  {item.category && <span>Category: {item.category}</span>}
                  {item.category && item.id && <span> • </span>}
                  <span>ID: {item.id}</span>
                </div>
              </div>
              {item.price && item.price > 0 && (
                <div className="text-base font-bold text-green-600">
                  ${item.price.toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="m-0 mb-2 text-blue-600 text-base font-semibold">
                {item.name}
              </h3>
              <div className="text-xs text-gray-600 mb-2">
                {item.category && <span>Category: {item.category}</span>}
              </div>
              {item.price && item.price > 0 && (
                <div className="text-base font-bold text-green-600 mt-auto">
                  ${item.price.toFixed(2)}
                </div>
              )}
              {item.description && (
                <p className="text-xs text-gray-600 mt-2 overflow-hidden line-clamp-2 leading-tight">
                  {item.description}
                </p>
              )}
            </>
          )}
        </Link>
      </div>
    );
  }, [items, gridConfig.itemsPerRow, viewMode]);    

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const loadCategories = async () => {
      try {
        await fetchCategories();
      } catch (error) {
        console.log('Categories not available:', error.message);
      }
    };
    
    loadCategories();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchCategories]);

  useEffect(() => {
    const urlSearchQuery = searchParams.get('q') || '';
    setSearchQuery(urlSearchQuery);
    setDisplayedSearchQuery(urlSearchQuery);
    setSelectedCategory(searchParams.get('category') || '');
    setSortBy(searchParams.get('sortBy') || 'id');
    setSortOrder(searchParams.get('sortOrder') || 'asc');
    setViewMode(searchParams.get('view') || 'grid');
  }, [searchParams]);

  if (loading && !items.length) {
    return (
      <div className="p-4 text-center">
        <p>Loading items...</p>
      </div>
    );
  }

  if (error && !items.length) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="mb-2">Error loading items: {error}</p>
        <button 
          onClick={loadItems} 
          className="mt-2 px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-screen flex flex-col">
      <div className="mb-5">
        <h1 className="text-2xl font-bold mb-2">Items</h1>
        {searchMetadata && (
          <p className="text-gray-600 text-sm">
            {searchMetadata.resultsFound} items found
            {searchMetadata.query && ` for "${searchMetadata.query}"`}
            {searchMetadata.category && ` in category "${searchMetadata.category}"`}
          </p>
        )}
      </div>

      <div className="mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200 flex-shrink-0">
        <Search 
          handleSearchSubmit={handleSearchSubmit}
          displayedSearchQuery={displayedSearchQuery}
          handleSearchInputChange={handleSearchInputChange}
          setDisplayedSearchQuery={setDisplayedSearchQuery} 
        />
        <CategoryFilter 
          categories={categories}
          selectedCategory={selectedCategory}
          handleCategoryChange={handleCategoryChange}
        />        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2 items-center">
            <label className="text-sm font-bold">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => handleSortChange(e.target.value, sortOrder)}
              className="px-2 py-1 rounded border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="id">ID</option>
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="category">Category</option>
            </select>
            
            <select 
              value={sortOrder} 
              onChange={(e) => handleSortChange(sortBy, e.target.value)}
              className="px-2 py-1 rounded border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="asc">A-Z / Low-High</option>
              <option value="desc">Z-A / High-Low</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm font-bold">Show:</label>
            <select 
              value={searchParams.get('limit') || 12} 
              onChange={(e) => handleLimitChange(e.target.value)}
              className="px-2 py-1 rounded border border-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="6">6 per page</option>
              <option value="12">12 per page</option>
              <option value="24">24 per page</option>
              <option value="48">48 per page</option>
            </select>
          </div>

          <ViewModeToggle 
            viewMode={viewMode}
            handleViewModeChange={handleViewModeChange}
          />

          <div className="text-xs text-gray-600 italic">
            ({items.length} items loaded)
          </div>

          {(searchQuery || selectedCategory || sortBy !== 'id' || sortOrder !== 'asc') && (
            <button 
              onClick={clearFilters}
              className="px-3 py-1 bg-gray-600 text-white border-none rounded cursor-pointer text-sm hover:bg-gray-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading && items.length > 0 && (
        <div className="text-center mb-4 text-gray-600">
          Loading...
        </div>
      )}

      {items.length > 0 ? (
        <div className="flex-1 min-h-0 mb-4">
          <AutoSizer>
            {({ height, width }) => {
              if (width !== containerDimensions.width || height !== containerDimensions.height) {
                setContainerDimensions({ width, height });
              }

              return (
                <Grid
                  ref={gridRef}
                  columnCount={gridConfig.columnCount}
                  columnWidth={gridConfig.columnWidth}
                  height={height - 100}
                  rowCount={rowCount}
                  rowHeight={gridConfig.rowHeight}
                  width={width}
                  overscanRowCount={2}
                  overscanColumnCount={1}
                  itemData={items}
                >
                  {ItemRenderer}
                </Grid>
              );
            }}
          </AutoSizer>
        </div>
      ) : (
        <div className="text-center py-10 flex-1">
          <h3 className="text-lg font-semibold mb-2">No items found</h3>
          <p className="mb-4">Try adjusting your search criteria or clearing the filters.</p>
          {(searchQuery || selectedCategory) && (
            <button 
              onClick={clearFilters}
              className="px-5 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {pagination && (
        <Pagination 
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}

export default Items;