import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ItemDetail = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchItem = async () => {
      try {
        setLoading(true);
        setError(null);        
        const response = await fetch(`http://localhost:3001/api/items/${id}`);
        
        // Check if component is still mounted before processing response
        if (!isMountedRef.current) {
          return;
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Item not found');
          }
          if (response.status === 400) {
            throw new Error('Invalid item ID');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const itemData = await response.json();
        
        // Final check before state update
        if (isMountedRef.current) {
          setItem(itemData);
        }
      } catch (err) {
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setError(err.message);
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchItem();
    } else {
      setError('No item ID provided');
      setLoading(false);
    }

    // Cleanup function
    return () => {
      isMountedRef.current = false;
    };
  }, [id]);

  // Additional cleanup on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <button 
          onClick={() => navigate('/')} 
          className="mb-4 px-4 py-2 cursor-pointer"
        >
          ← Back to Items
        </button>
        <p>Loading item {id}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <button 
          onClick={() => navigate('/')} 
          className="mb-4 px-4 py-2 cursor-pointer"
        >
          Back to Items
        </button>
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="mb-2">Error: {error}</p>
        <p className="mb-4">Tried to fetch item with ID: {id}</p>
        <div className="mt-4 flex gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-4">
        <button 
          onClick={() => navigate('/')} 
          className="mb-4 px-4 py-2 cursor-pointer"
        >
          Back to Items
        </button>
        <h2 className="text-xl font-bold mb-2">Item Not Found</h2>
        <p>Could not find item with ID: {id}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <button 
        onClick={() => navigate('/')} 
        className="mb-4 px-4 py-2 cursor-pointer bg-gray-600 text-white border-none rounded hover:bg-gray-700 transition-colors"
      >
        Back to Items
      </button>
      
      <div className="max-w-2xl bg-white border border-gray-300 rounded-lg p-6 shadow-sm">
        <h1 className="m-0 mb-4 text-2xl font-bold text-gray-800">
          {item.name}
        </h1>
        
        <div className="mb-3">
          <strong>ID:</strong> {item.id}
        </div>
        
        {item.category && (
          <div className="mb-3">
            <strong>Category:</strong> 
            <span className="ml-2 px-2 py-1 bg-gray-100 rounded-full text-sm">
              {item.category}
            </span>
          </div>
        )}
        
        {item.price && (
          <div className="mb-4">
            <strong>Price:</strong> 
            <span className="ml-2 text-2xl font-bold text-green-600">
              ${item.price.toFixed(2)}
            </span>
          </div>
        )}
        
        {item.description && (
          <div className="mb-4">
            <strong>Description:</strong>
            <p className="mt-2 p-3 bg-gray-50 rounded text-sm leading-relaxed">
              {item.description}
            </p>
          </div>
        )}
        
        {item.createdAt && (
          <div className="text-xs text-gray-600 mt-5">
            Added: {new Date(item.createdAt).toLocaleDateString()}
          </div>
        )}
      </div>    
    </div>
  );
}

export default ItemDetail;