import { useMemo } from 'react';

const Pagination = ({ pagination, onPageChange }) => {
  const {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage,
    hasPrevPage
  } = pagination;

  const pageNumbers = useMemo(() => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Add first page and dots if necessary
    if (start > 2) {
      rangeWithDots.push(1);
      if (start > 3) {
        rangeWithDots.push('...');
      }
    } else if (start === 2) {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    // Add last page and dots if necessary
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(totalPages);
    } else if (end === totalPages - 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  const itemRange = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    return { start, end };
  }, [currentPage, itemsPerPage, totalItems]);

  const handlePageClick = (page) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const handlePrevious = () => {
    if (hasPrevPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (hasNextPage) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage !== 1) {
      onPageChange(1);
    }
  };

  const handleLast = () => {
    if (currentPage !== totalPages) {
      onPageChange(totalPages);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-4 mt-5 p-5 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-sm text-gray-600 text-center">
        Showing {itemRange.start} to {itemRange.end} of {totalItems} items
        <span className="ml-2">
          (Page {currentPage} of {totalPages})
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-1">
        <button
          onClick={handleFirst}
          disabled={currentPage === 1}
          className={`px-3 py-2 mx-0.5 border border-gray-300 rounded text-sm transition-all min-w-[40px] text-center ${
            currentPage === 1 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
              : 'bg-white cursor-pointer hover:bg-gray-100'
          }`}
          title="First page"
        >
          ««
        </button>

        <button
          onClick={handlePrevious}
          disabled={!hasPrevPage}
          className={`px-3 py-2 mx-0.5 border border-gray-300 rounded text-sm transition-all min-w-[40px] text-center ${
            !hasPrevPage 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
              : 'bg-white cursor-pointer hover:bg-gray-100'
          }`}
          title="Previous page"
        >
          «
        </button>

        {pageNumbers.map((page, index) => (
          <span key={index}>
            {page === '...' ? (
              <span className="px-1 py-2 text-gray-600">...</span>
            ) : (
              <button
                onClick={() => handlePageClick(page)}
                className={`px-3 py-2 mx-0.5 border rounded text-sm transition-all min-w-[40px] text-center cursor-pointer ${
                  page === currentPage 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-100'
                }`}
                title={`Go to page ${page}`}
              >
                {page}
              </button>
            )}
          </span>
        ))}

        <button
          onClick={handleNext}
          disabled={!hasNextPage}
          className={`px-3 py-2 mx-0.5 border border-gray-300 rounded text-sm transition-all min-w-[40px] text-center ${
            !hasNextPage 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
              : 'bg-white cursor-pointer hover:bg-gray-100'
          }`}
          title="Next page"
        >
          »
        </button>

        <button
          onClick={handleLast}
          disabled={currentPage === totalPages}
          className={`px-3 py-2 mx-0.5 border border-gray-300 rounded text-sm transition-all min-w-[40px] text-center ${
            currentPage === totalPages 
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' 
              : 'bg-white cursor-pointer hover:bg-gray-100'
          }`}
          title="Last page"
        >
          »»
        </button>
      </div>

      {totalPages > 10 && (
        <div className="flex items-center gap-2 text-sm">
          <span>Jump to page:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            defaultValue={currentPage}
            className="w-15 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  handlePageClick(page);
                }
              }
            }}
            onBlur={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages && page !== currentPage) {
                handlePageClick(page);
              } else {
                e.target.value = currentPage;
              }
            }}
          />
          <span className="text-gray-600">of {totalPages}</span>
        </div>
      )}
    </div>
  );
}

export default Pagination;