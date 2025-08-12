const ViewModeToggle = ({ viewMode, handleViewModeChange }) => (
  <div className="flex gap-1 items-center">
    <label className="text-sm font-bold">View:</label>
    <button
      onClick={() => handleViewModeChange('grid')}
      className={`px-2 py-1 border border-gray-300 rounded cursor-pointer text-xs transition-colors ${
        viewMode === 'grid' 
          ? 'bg-blue-600 text-white border-blue-600' 
          : 'bg-white text-black hover:bg-gray-50'
      }`}
    >
      Grid
    </button>
    <button
      onClick={() => handleViewModeChange('list')}
      className={`px-2 py-1 border border-gray-300 rounded cursor-pointer text-xs transition-colors ${
        viewMode === 'list' 
          ? 'bg-blue-600 text-white border-blue-600' 
          : 'bg-white text-black hover:bg-gray-50'
      }`}
    >
      List
    </button>
  </div>
);

export default ViewModeToggle;