import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';

export default function MerchStore() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ userType: 'member' });
  const [userPoints, setUserPoints] = useState(2450);

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({
        userType: userData.userType || 'member'
      });
      setUserPoints(userData.points || 2450);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    // Fetch real products from API (for now showing empty state)
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Future: call '/api/products' or '/api/merch'
        setProducts([]); // Show empty state instead of fake data
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]); // Show empty state instead of fake data
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    if (filter === 'featured') return product.featured;
    if (filter === 'apparel') return product.category === 'apparel';
    if (filter === 'accessories') return product.category === 'accessories';
    if (filter === 'in-stock') return product.inStock;
    return true;
  });

  const addToCart = (product) => {
    setCart([...cart, { ...product, quantity: 1 }]);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <PageLayout
        userType={user.userType}
        title="Merch Store"
        subtitle="Loading products..."
        showPointsInHeader={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading store...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter('all')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        All Items ({products.length})
      </button>
      <button
        onClick={() => setFilter('featured')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'featured' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Featured ({products.filter(p => p.featured).length})
      </button>
      <button
        onClick={() => setFilter('apparel')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'apparel' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Apparel ({products.filter(p => p.category === 'apparel').length})
      </button>
      <button
        onClick={() => setFilter('accessories')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'accessories' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Accessories ({products.filter(p => p.category === 'accessories').length})
      </button>
      <button
        onClick={() => setFilter('in-stock')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'in-stock' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        In Stock ({products.filter(p => p.inStock).length})
      </button>
    </div>
  );

  const cartButton = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        <span className="font-bold text-gray-900 text-sm">{userPoints.toLocaleString()} pts</span>
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
        </svg>
        Cart ({getTotalItems()})
      </button>
    </div>
  );

  return (
    <PageLayout
      userType={user.userType}
      title="Merch Store"
      subtitle="Show your tDIL pride with official merchandise"
      userPoints={userPoints}
      headerContent={filterButtons}
      headerActions={cartButton}
    >
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative">
              <img src={product.image} alt={product.name} className="w-full h-64 object-cover" />
              {product.featured && (
                <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Featured
                </div>
              )}
              {!product.inStock && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <span className="text-lg font-bold text-gray-900">${product.price}</span>
                <span className="text-sm text-blue-600 font-medium">or {product.points} pts</span>
              </div>

              {product.sizes.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                    {product.sizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => addToCart(product)}
                  disabled={!product.inStock}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                    product.inStock
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                </button>
                <button
                  disabled={!product.inStock}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                    product.inStock
                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Use Points
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more products.</p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8">
        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">How to Earn Points</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              <span>Connect with members: <strong>+25 pts</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
              </svg>
              <span>Attend events: <strong>+50-300 pts</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h2zm4-3a1 1 0 00-1 1v1h2V4a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>Refer job opportunities: <strong>+100 pts</strong></span>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
