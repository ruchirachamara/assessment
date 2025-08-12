const Search = ({ handleSearchSubmit, displayedSearchQuery, handleSearchInputChange, setDisplayedSearchQuery }) => (
  <div className="mb-4">
    <form onSubmit={(e) => { e.preventDefault(); handleSearchSubmit(displayedSearchQuery); }}>
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            value={displayedSearchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search items... (minimum 3 characters)"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {displayedSearchQuery && displayedSearchQuery.length < 3 && displayedSearchQuery.length > 0 && (
            <div className="absolute left-0 top-full mt-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
              Type at least 3 characters to search
            </div>
          )}
        </div>
        <button 
          type="submit"
          disabled={displayedSearchQuery.length > 0 && displayedSearchQuery.length < 3}
          className="px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Search
        </button>
        {displayedSearchQuery && (
          <button 
            type="button"
            onClick={() => {
              setDisplayedSearchQuery('');
              handleSearchSubmit('');
            }}
            className="px-4 py-2 bg-gray-600 text-white border-none rounded cursor-pointer hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  </div>
);

export default Search;