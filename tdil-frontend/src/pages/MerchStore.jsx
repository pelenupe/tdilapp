import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';

export default function MerchStore() {
  const { user } = useUser();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    points_price: '',
    category: 'apparel',
    sizes: 'S,M,L,XL',
    stock: 10,
    featured: false,
    redeemable_with_points: false
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/merch', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login.');
        return;
      }

      const response = await fetch('/api/merch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProduct)
      });

      if (response.ok) {
        setShowModal(false);
        setNewProduct({
          name: '',
          description: '',
          price: '',
          points_price: '',
          category: 'apparel',
          sizes: 'S,M,L,XL',
          stock: 10,
          featured: false,
          redeemable_with_points: false
        });
        fetchProducts();
        alert('Product added successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to add product.');
      }
    } catch (error) {
      console.error('Create product error:', error);
      alert('Failed to add product. Please try again.');
    }
  };

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true;
    if (filter === 'featured') return product.featured;
    if (filter === 'apparel') return product.category === 'apparel';
    if (filter === 'accessories') return product.category === 'accessories';
    if (filter === 'points') return product.redeemable_with_points;
    if (filter === 'in-stock') return product.stock > 0;
    return true;
  });

  const addToCart = (product) => {
    setCart([...cart, { ...product, quantity: 1 }]);
    alert(`${product.name} added to cart!`);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const isAdmin = user?.userType === 'admin' || user?.userType === 'founder';

  if (loading) {
    return (
      <PageLayout
        userType={user?.userType || 'member'}
        title="Merch Store"
        subtitle="Loading products..."
        showPointsInHeader={true}
        userPoints={user?.points || 0}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading store...</div>
        </div>
      </PageLayout>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      {isAdmin && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
        >
          ➕ Add Product
        </button>
      )}
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
        🛒 Cart ({getTotalItems()})
      </button>
    </div>
  );

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
        onClick={() => setFilter('points')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'points' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        ⭐ Points Redemption ({products.filter(p => p.redeemable_with_points).length})
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
    </div>
  );

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Merch Store"
      subtitle="Show your tDIL pride with official merchandise"
      userPoints={user?.points || 0}
      showPointsInHeader={true}
      headerContent={filterButtons}
      headerActions={headerActions}
    >
      {/* Add Product Modal (Admin Only) */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add New Product</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              
              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., tDIL T-Shirt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="25.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Points Price</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.points_price}
                      onChange={(e) => setNewProduct({...newProduct, points_price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="apparel">Apparel</option>
                      <option value="accessories">Accessories</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma-separated)</label>
                  <input
                    type="text"
                    value={newProduct.sizes}
                    onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="S,M,L,XL"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newProduct.featured}
                      onChange={(e) => setNewProduct({...newProduct, featured: e.target.checked})}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Featured</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newProduct.redeemable_with_points}
                      onChange={(e) => setNewProduct({...newProduct, redeemable_with_points: e.target.checked})}
                      className="w-4 h-4 text-yellow-500"
                    />
                    <span className="text-sm text-gray-700">Redeemable with Points</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative">
              <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <span className="text-6xl">👕</span>
              </div>
              {product.featured && (
                <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Featured
                </div>
              )}
              {product.redeemable_with_points && (
                <div className="absolute top-3 right-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  ⭐ Points
                </div>
              )}
              {product.stock <= 0 && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-gray-900">${parseFloat(product.price || 0).toFixed(2)}</span>
                {product.points_price && product.redeemable_with_points && (
                  <span className="text-sm text-yellow-600 font-medium">or {product.points_price} pts</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                    product.stock > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
                {product.redeemable_with_points && product.points_price && (
                  <button
                    disabled={product.stock <= 0 || (user?.points || 0) < product.points_price}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                      product.stock > 0 && (user?.points || 0) >= product.points_price
                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Use {product.points_price} Points
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">
            {isAdmin ? 'Add your first product to get started!' : 'Check back soon for new merchandise!'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Add Product
            </button>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-bold text-blue-900 mb-3">💡 Earn Points to Redeem Merch!</h3>
        <p className="text-blue-800 mb-4">Some items can be redeemed using your tDIL points. Look for the ⭐ Points badge!</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span>Connect with members: <strong>+50 pts</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Attend events: <strong>+50-100 pts</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span>💼</span>
            <span>Apply to jobs: <strong>+25 pts</strong></span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
