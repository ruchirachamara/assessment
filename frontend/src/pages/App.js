import { Routes, Route, Link } from 'react-router-dom';

import Items from './Items';
import ItemDetail from './ItemDetail';
import { DataProvider } from '../state/DataContext';

import '../../src/index.css';

function App() {
  return (
    <DataProvider>
      <nav className="p-4 border-b border-gray-300">
        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
          Items
        </Link>
      </nav>
      <Routes>
        <Route path="/" element={<Items />} />
        <Route path="/items/:id" element={<ItemDetail />} />
      </Routes>
    </DataProvider>
  );
}

export default App;