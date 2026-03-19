import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';

const TDIL_LOGO = '/tdil-logo.png';

export default function MerchStore() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // [{ id, name, price, quantity, size, image }]
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'cancelled' | null
  const [selectedSizes, setSelectedSizes] = useState({}); // { productId: size }
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', price: '', points_price: '',
    category: 'apparel', sizes: 'S,M,L,XL', stock: 10,
    featured: false, redeemable_with_points: false
  });

  // Check payment return from Square
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('payment') === 'success') {
      setPaymentStatus('success');
      setCart([]);
      navigate('/merch-store', { replace: true });
    } else if (params.get('payment') === 'cancelled') {
      setPaymentStatus('cancelled');
      navigate('/merch-store', { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/merch', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Cart helpers
  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product) => {
    const sizes = product.sizes ? product.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
    const size = sizes.length > 0 ? (selectedSizes[product.id] || sizes[0]) : null;
    const key = `${product.id}-${size || 'none'}`;

    setCart(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        key,
        id: product.id,
        name: product.name,
        price: product.price,
        size,
        quantity: 1,
        image: product.image_url || null
      }];
    });
    setShowCart(true);
  };

  const updateQuantity = (key, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.key === key ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i);
      return updated.filter(i => i.quantity > 0);
    });
  };

  const removeFromCart = (key) => {
    setCart(prev => prev.filter(i => i.key !== key));
  };

  // Square checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    setCheckingOut(true);
    try {
      const res = await fetch('/api/square/checkout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            size: i.size || undefined
          }))
        })
      });

      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || data.details || 'Checkout failed. Please try again.');
      }
    } catch (err) {
      alert('Checkout failed. Please check your connection and try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/merch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      });
      if (res.ok) {
        setShowModal(false);
        setNewProduct({ name: '', description: '', price: '', points_price: '', category: 'apparel', sizes: 'S,M,L,XL', stock: 10, featured: false, redeemable_with_points: false });
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add product.');
      }
    } catch {
      alert('Failed to add product.');
    }
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'featured') return p.featured;
    if (filter === 'apparel') return p.category === 'apparel';
    if (filter === 'accessories') return p.category === 'accessories';
    if (filter === 'points') return p.redeemable_with_points;
    if (filter === 'in-stock') return p.stock > 0;
    return true;
  });

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/merch/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete product.');
      }
    } catch {
      alert('Failed to delete product.');
    }
  };

  const isAdmin = user?.userType === 'admin' || user?.userType === 'founder';

  if (loading) {
    return (
      <PageLayout userType={user?.userType || 'member'} title="Merch Store" subtitle="Loading..." showPointsInHeader userPoints={user?.points || 0}>
        <div className="flex items-center justify-center py-12"><div className="text-gray-600">Loading store...</div></div>
      </PageLayout>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-3">
      {isAdmin && (
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm">
          ➕ Add Product
        </button>
      )}
      <button onClick={() => setShowCart(true)}
        className="relative bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
        🛒 Cart
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {cartCount}
          </span>
        )}
      </button>
    </div>
  );

  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      {[
        { key: 'all', label: `All (${products.length})` },
        { key: 'points', label: `⭐ Points (${products.filter(p => p.redeemable_with_points).length})` },
        { key: 'apparel', label: `Apparel (${products.filter(p => p.category === 'apparel').length})` },
        { key: 'accessories', label: `Accessories (${products.filter(p => p.category === 'accessories').length})` },
        { key: 'in-stock', label: `In Stock (${products.filter(p => p.stock > 0).length})` },
      ].map(({ key, label }) => (
        <button key={key} onClick={() => setFilter(key)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${filter === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <PageLayout userType={user?.userType || 'member'} title="Merch Store"
      subtitle="Show your tDIL pride with official merchandise"
      userPoints={user?.points || 0} showPointsInHeader headerContent={filterButtons} headerActions={headerActions}>

      {/* Payment status banners */}
      {paymentStatus === 'success' && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-semibold text-green-800">Order placed successfully!</div>
            <div className="text-sm text-green-600">Thank you for your purchase. You'll receive a confirmation email from Square shortly.</div>
          </div>
        </div>
      )}
      {paymentStatus === 'cancelled' && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-yellow-800">Checkout was cancelled</div>
            <div className="text-sm text-yellow-600">Your cart has been saved. Add items and try again when ready.</div>
          </div>
          <button onClick={() => setPaymentStatus(null)} className="ml-auto text-yellow-600 hover:text-yellow-800">✕</button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => {
          const sizes = product.sizes ? product.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
          const selectedSize = selectedSizes[product.id] || (sizes[0] || null);
          return (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative">
                <div className="w-full h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = TDIL_LOGO; }} />
                  ) : (
                    <img src={TDIL_LOGO} alt={product.name} className="w-24 h-24 object-contain opacity-60" />
                  )}
                </div>
                {product.featured && (
                  <div className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">⭐ Featured</div>
                )}
                {product.redeemable_with_points && (
                  <div className="absolute top-3 right-3 bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">Points</div>
                )}
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">Out of Stock</span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

                {/* Size selector */}
                {sizes.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Size</div>
                    <div className="flex flex-wrap gap-1">
                      {sizes.map(size => (
                        <button key={size} onClick={() => setSelectedSizes(prev => ({ ...prev, [product.id]: size }))}
                          className={`px-2 py-1 text-xs rounded border font-medium transition-colors ${selectedSize === size ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-900">${parseFloat(product.price || 0).toFixed(2)}</span>
                  {product.points_price && product.redeemable_with_points && (
                    <span className="text-sm text-yellow-600 font-medium">or {product.points_price} pts</span>
                  )}
                </div>

                <button onClick={() => addToCart(product)} disabled={product.stock <= 0}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
                    product.stock > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}>
                  {product.stock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                </button>

                {/* Admin delete button */}
                {isAdmin && (
                  <button onClick={() => handleDeleteProduct(product.id, product.name)}
                    className="w-full mt-2 py-1.5 px-4 rounded-lg font-medium transition-colors text-sm bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                    🗑 Delete Product
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 mb-4">{isAdmin ? 'Add your first product!' : 'Check back soon!'}</p>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Add Product
            </button>
          )}
        </div>
      )}

      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <h3 className="text-lg font-bold text-blue-900 mb-2">💡 Earn Points to Redeem Merch!</h3>
        <p className="text-blue-800 text-sm mb-3">Some items can be redeemed using your tDIL points. Look for the Points badge!</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-blue-800">
          <div className="flex items-center gap-2"><span>👥</span><span>Connect with members: <strong>+50 pts</strong></span></div>
          <div className="flex items-center gap-2"><span>📅</span><span>Attend events: <strong>+50–100 pts</strong></span></div>
          <div className="flex items-center gap-2"><span>💼</span><span>Apply to jobs: <strong>+25 pts</strong></span></div>
        </div>
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            {/* Cart header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Your Cart ({cartCount})</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-3">🛒</div>
                  <p>Your cart is empty</p>
                </div>
              ) : cart.map(item => (
                <div key={item.key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-14 h-14 bg-white rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = TDIL_LOGO; }} />
                    ) : (
                      <img src={TDIL_LOGO} alt={item.name} className="w-8 h-8 object-contain opacity-50" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                    {item.size && <div className="text-xs text-gray-500">Size: {item.size}</div>}
                    <div className="text-sm font-medium text-blue-600 mt-0.5">${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateQuantity(item.key, -1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-sm">−</button>
                    <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.key, 1)}
                      className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold text-sm">+</button>
                    <button onClick={() => removeFromCart(item.key)}
                      className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 text-sm ml-1">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 px-6 py-4 space-y-3">
                <div className="flex items-center justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={handleCheckout} disabled={checkingOut}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {checkingOut ? (
                    <><span className="animate-spin">⏳</span> Redirecting to Square...</>
                  ) : (
                    <><span>💳</span> Checkout with Square</>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center">Secure checkout powered by Square</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal (Admin) */}
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
                  <input type="text" required value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., tDIL T-Shirt" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={newProduct.description} rows={2}
                    onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Product description..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                    <input type="number" required step="0.01" min="0" value={newProduct.price}
                      onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="25.00" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Points Price</label>
                    <input type="number" min="0" value={newProduct.points_price}
                      onChange={e => setNewProduct({ ...newProduct, points_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="apparel">Apparel</option>
                      <option value="accessories">Accessories</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input type="number" min="0" value={newProduct.stock}
                      onChange={e => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sizes (comma-separated)</label>
                  <input type="text" value={newProduct.sizes}
                    onChange={e => setNewProduct({ ...newProduct, sizes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="S,M,L,XL" />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newProduct.featured}
                      onChange={e => setNewProduct({ ...newProduct, featured: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Featured</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={newProduct.redeemable_with_points}
                      onChange={e => setNewProduct({ ...newProduct, redeemable_with_points: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Redeemable with Points</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">Add Product</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
