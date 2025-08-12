const CategoryFilter = ({ categories, selectedCategory, handleCategoryChange }) => (
  categories.length > 0 && (
    <div className="mb-4">
      <label className="block mb-2 font-bold text-sm">
        Filter by Category:
      </label>
      <select 
        value={selectedCategory} 
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Categories</option>
        {categories.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
    </div>
  )
);

export default CategoryFilter;