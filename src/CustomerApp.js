import config from './config';
import React, { useState, useEffect } from 'react';

function CustomerApp() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    address: '',
    instructions: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [menuRes, categoriesRes] = await Promise.all([
        fetch(`${config.API_URL}/api/menu`),
        fetch(`${config.API_URL}/api/categories`)  
      ]);
      
      const menuData = await menuRes.json();
      const categoriesData = await categoriesRes.json();
      
      if (menuData.success) setMenuItems(menuData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
      setLoading(false);
    } catch (err) {
      setError('Cannot connect to server');
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    let filtered = menuItems;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category_id === parseInt(selectedCategory));
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filter === 'veg') {
      filtered = filtered.filter(item => item.is_vegetarian);
    } else if (filter === 'nonveg') {
      filtered = filtered.filter(item => !item.is_vegetarian);
    }
    
    return filtered;
  };

  const getItemsByCategory = () => {
    const filtered = getFilteredItems();
    const grouped = {};
    
    filtered.forEach(item => {
      const catId = item.category_id;
      if (!grouped[catId]) {
        grouped[catId] = {
          category: categories.find(c => c.id === catId) || { name: 'Other', id: catId },
          items: []
        };
      }
      grouped[catId].items.push(item);
    });
    
    return Object.values(grouped);
  };

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      setCart(cart.filter(i => i.id !== itemId));
    } else {
      setCart(cart.map(i => 
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      ));
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(i => i.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = cartTotal > 499 ? 0 : 40;
  const grandTotal = cartTotal + deliveryFee;

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    setShowCheckout(true);
    setShowCart(false);
  };

  const placeOrder = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address) {
      alert('Please fill all required fields');
      return;
    }

    // Calculate preparation time (30 mins from now)
    const now = new Date();
    const deliveryTime = new Date(now.getTime() + 30 * 60000); // Add 30 minutes
    
    // Format for display
    const formattedTime = deliveryTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    try {
      // Prepare order data
      const orderData = {
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        customer_address: customerDetails.address,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: cartTotal,
        delivery_fee: deliveryFee,
        total: grandTotal,
        payment_method: 'cod',
        special_instructions: customerDetails.instructions || '',
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_time: deliveryTime.toTimeString().split(' ')[0].substring(0,5)
      };

      console.log('Saving order:', orderData);

      const response = await fetch(`${config.API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      console.log('Order saved response:', data);

      if (data.success) {
        // Simple WhatsApp message
        let message = `NEW ORDER - ABC RESTAURANT\n`;
        message += `------------------------------------\n`;
        message += `CUSTOMER DETAILS\n`;
        message += `------------------------------------\n`;
        message += `Name: ${customerDetails.name}\n`;
        message += `Phone: ${customerDetails.phone}\n`;
        message += `Address: ${customerDetails.address}\n`;
        if (customerDetails.instructions) {
          message += `Instructions: ${customerDetails.instructions}\n`;
        }
        
        
        message += `------------------------------------\n`;
        message += `ORDER ITEMS\n`;
        message += `------------------------------------\n`;
        
        cart.forEach(item => {
          message += `${item.name} x${item.quantity} = ₹${item.price * item.quantity}\n`;
        });
        
        message += `\n------------------------------------\n`;
        message += `BILL DETAILS\n`;
        message += `------------------------------------\n`;
        message += `Subtotal: ₹${cartTotal}\n`;
        message += `Delivery: ${deliveryFee === 0 ? 'FREE' : '₹' + deliveryFee}\n`;
        message += `------------------------------------\n`;
        message += `TOTAL: ₹${grandTotal}\n\n`;
        message += `Order ID: ${data.data.order_number}\n`;
        message += `------------------------------------\n`;
        message += `Thank you for ordering!\n`;
        
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/919347209807?text=${encoded}`, '_blank');
        
        // Clear cart and close
        setCart([]);
        setShowCart(false);
        setShowCheckout(false);
        setCustomerDetails({ 
          name: '', 
          phone: '', 
          address: '', 
          instructions: ''
        });
        
        alert(`Order placed! Order ID: ${data.data.order_number}`);
      } else {
        alert('Failed to save order: ' + (data.error || data.message));
      }
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="text-xl mb-2">⚠️ Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const groupedItems = getItemsByCategory();
  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-orange-500 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="transform hover:scale-105 transition-transform duration-300">
              <h1 className="text-2xl font-bold">ABC Restaurant</h1>
              <p className="text-sm text-orange-100">Indian • Chinese • Continental</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block w-64">
                <input
                  type="text"
                  placeholder="Search for dishes"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-orange-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white bg-white"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              </div>
              
              <button 
                onClick={() => setShowCart(true)}
                className="relative p-2 hover:bg-orange-600 rounded-full transition-all duration-300 transform hover:scale-110"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile search */}
          <div className="relative mt-3 md:hidden">
            <input
              type="text"
              placeholder="Search for dishes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-orange-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white bg-white"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto py-3 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap text-sm font-medium pb-2 transition-all duration-300 hover:text-orange-500 ${
                selectedCategory === 'all' 
                  ? 'text-orange-500 border-b-2 border-orange-500' 
                  : 'text-gray-600'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id.toString())}
                className={`whitespace-nowrap text-sm font-medium pb-2 transition-all duration-300 hover:text-orange-500 ${
                  selectedCategory === cat.id.toString() 
                    ? 'text-orange-500 border-b-2 border-orange-500' 
                    : 'text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Filter by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                  filter === 'all'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('veg')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-300 transform hover:scale-105 ${
                  filter === 'veg'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>🟢</span> Veg
              </button>
              <button
                onClick={() => setFilter('nonveg')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-300 transform hover:scale-105 ${
                  filter === 'nonveg'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>🔴</span> Non-Veg
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">{filteredItems.length}</span> items found
          </p>
          {searchQuery && (
            <p className="text-sm text-gray-500">
              Search results for "<span className="font-medium">{searchQuery}</span>"
            </p>
          )}
        </div>

        {groupedItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedItems.map(group => (
              <section key={group.category.id} className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-orange-500 inline-block">
                  {group.category.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.items.map(item => (
                    <div 
                      key={item.id} 
                      className="flex gap-4 p-4 border border-gray-100 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-orange-200"
                    >
                      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-800 hover:text-orange-500 transition-colors duration-300">
                                {item.name}
                              </h3>
                              <span className="text-sm">{item.is_vegetarian ? '🟢' : '🔴'}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <span className="font-medium text-gray-800">₹{item.price}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-500">{item.preparation_time} mins</span>
                            </div>
                          </div>

                          {item.is_available ? (
                            <button
                              onClick={() => addToCart(item)}
                              className="px-4 py-1.5 border-2 border-orange-500 text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-500 hover:text-white transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                            >
                              ADD
                            </button>
                          ) : (
                            <span className="text-sm text-red-500 font-medium">Sold out</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed top-0 right-0 w-full max-w-md h-full bg-white shadow-2xl z-50 flex flex-col animate-slideIn">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-orange-500 text-white">
              <h2 className="text-lg font-medium">Your Cart</h2>
              <button 
                onClick={() => setShowCart(false)}
                className="w-8 h-8 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all duration-300 hover:rotate-90"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <p className="text-sm">Your cart is empty</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 animate-fadeIn">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{item.name}</h4>
                        <p className="text-xs text-gray-500">₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                        >
                          -
                        </button>
                        <span className="text-sm w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-2 text-red-500 hover:text-red-600 transition-all duration-300 hover:scale-110"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery fee</span>
                    <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-orange-500">₹{grandTotal}</span>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  PROCEED TO CHECKOUT
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60] animate-fadeIn"
            onClick={() => setShowCheckout(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-md z-[60] max-h-[90vh] overflow-y-auto animate-scaleIn">
            <h2 className="text-2xl font-bold text-orange-500 mb-6 text-center">Delivery Details</h2>
            <form onSubmit={(e) => { e.preventDefault(); placeOrder(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={customerDetails.name}
                    onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={customerDetails.phone}
                    onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="10-digit mobile number"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
                  <textarea
                    value={customerDetails.address}
                    onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="House/Flat No., Area, Landmark"
                    rows="2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                  <textarea
                    value={customerDetails.instructions}
                    onChange={(e) => setCustomerDetails({...customerDetails, instructions: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="Any specific requests?"
                    rows="2"
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Order Summary</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Items:</span>
                    <span>{cart.length}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total Amount:</span>
                    <span className="text-orange-500">₹{grandTotal}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ⏱️ Ready in approximately 30 minutes
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Place Order
                  </button>
                  <button 
                    type="button" 
                    className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    onClick={() => setShowCheckout(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        
        @keyframes scaleIn {
          from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

export default CustomerApp;