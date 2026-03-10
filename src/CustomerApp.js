import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from './config';

function CustomerApp() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentStep, setPaymentStep] = useState('selection');
  const [selectedUPIApp, setSelectedUPIApp] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    address_type: 'home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false
  });
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    name: ''
  });
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    instructions: ''
  });
  
  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginStep, setLoginStep] = useState('mobile');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loginError, setLoginError] = useState('');
  const otpInputRefs = useRef([]);
  
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('customerToken');
  });
  const [customerData, setCustomerData] = useState(() => {
    return JSON.parse(localStorage.getItem('customer') || '{}');
  });

  // Auto-fill checkout with customer data when logged in
  useEffect(() => {
    if (isLoggedIn && customerData) {
      setCustomerDetails(prev => ({
        ...prev,
        name: customerData.name || prev.name,
        phone: customerData.mobile || prev.phone,
        email: customerData.email || prev.email
      }));
    }
  }, [isLoggedIn, customerData]);

  // Fetch addresses when logged in
  const fetchAddresses = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const token = localStorage.getItem('customerToken');
      const response = await fetch(`${config.API_URL}/api/customer/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setAddresses(data.data || []);
        // Select default address if exists
        const defaultAddr = data.data.find(addr => addr.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setCustomerDetails(prev => ({
            ...prev,
            address: `${defaultAddr.address_line1}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pincode}`
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchData();
    
    const checkLoginStatus = () => {
      setIsLoggedIn(!!localStorage.getItem('customerToken'));
      setCustomerData(JSON.parse(localStorage.getItem('customer') || '{}'));
    };
    
    window.addEventListener('storage', checkLoginStatus);
    
    // Check if returning from login with checkout intent
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'true') {
      const savedCart = localStorage.getItem('pendingCart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
        localStorage.removeItem('pendingCart');
        setShowCheckout(true);
      }
      // Remove query param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    return () => window.removeEventListener('storage', checkLoginStatus);
  }, []);

  // Fetch addresses when checkout opens
  useEffect(() => {
    if (showCheckout && isLoggedIn) {
      fetchAddresses();
    }
  }, [showCheckout, isLoggedIn, fetchAddresses]);

  // Timer for OTP resend
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (loginStep === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [loginStep]);

  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

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
      showToastMessage(`Added another ${item.name} to cart`);
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
      showToastMessage(`${item.name} added to cart`);
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
    showToastMessage('Item removed from cart');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = cartTotal > 499 ? 0 : 40;
  const grandTotal = cartTotal + deliveryFee;

  // Handle checkout - show login modal for non-logged in users
  const handleCheckout = () => {
    if (cart.length === 0) {
      showToastMessage('Your cart is empty');
      return;
    }
    
    if (!isLoggedIn) {
      setShowLoginModal(true);
      setLoginStep('mobile');
      setMobileNumber('');
      setOtp(['', '', '', '', '', '']);
      setLoginError('');
      setShowCart(false);
    } else {
      fetchAddresses();
      setShowCheckout(true);
      setShowCart(false);
    }
  };

  // Handle sending OTP
  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      setLoginError('Enter valid 10-digit mobile number');
      return;
    }

    setIsVerifying(true);
    setLoginError('');

    try {
      const response = await fetch(`${config.API_URL}/api/otp/send`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ mobile: mobileNumber })
      });

      const data = await response.json();

      if (data.success) {
        setLoginStep('otp');
        setTimer(60);
        // Show OTP in alert for development - user must remember and type it
        if (data.debug?.otp) {
          alert(`Your OTP is: ${data.debug.otp}`);
        }
        showToastMessage('OTP sent successfully!');
      } else {
        setLoginError(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP Error:', error);
      setLoginError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setLoginError('Enter complete OTP');
      return;
    }

    setIsVerifying(true);
    setLoginError('');

    try {
      const response = await fetch(`${config.API_URL}/api/otp/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          mobile: mobileNumber,
          otp: otpString 
        })
      });

      const data = await response.json();

      if (data.success) {
        // Save customer data exactly as MobileLogin.js does
        localStorage.setItem('customerToken', data.data.token);
        localStorage.setItem('customer', JSON.stringify(data.data.customer));
        
        // Trigger storage event for other tabs
        window.dispatchEvent(new Event('storage'));
        
        // Update state
        setIsLoggedIn(true);
        setCustomerData(data.data.customer);
        
        // Auto-fill checkout with customer data
        setCustomerDetails(prev => ({
          ...prev,
          name: data.data.customer.name || '',
          phone: data.data.customer.mobile || mobileNumber,
          email: data.data.customer.email || ''
        }));

        // Close login modal and open checkout
        setShowLoginModal(false);
        setShowCheckout(true);
        fetchAddresses(); // Fetch addresses for the logged in user
        
        // Reset login form
        setMobileNumber('');
        setOtp(['', '', '', '', '', '']);
        setLoginStep('mobile');
        setTimer(0);
        
        showToastMessage('Login successful!');
      } else {
        setLoginError(data.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']); // Clear OTP on error
      }
    } catch (error) {
      console.error('Verification Error:', error);
      setLoginError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace key
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    if (timer > 0) return;
    
    setIsVerifying(true);
    try {
      const response = await fetch(`${config.API_URL}/api/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTimer(60);
        if (data.debug?.otp) {
          alert(`New OTP: ${data.debug.otp}\n\nPlease enter it manually.`);
        }
        setOtp(['', '', '', '', '', '']); // Clear previous OTP
        showToastMessage('OTP resent successfully!');
      }
    } catch (error) {
      setLoginError('Failed to resend OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (paymentMethod === 'demo' && !selectedUPIApp) {
        showToastMessage('Please select a UPI app to continue', 'error');
        return;
    }
    
    setPaymentStep('processing');
    
    setTimeout(() => {
        setPaymentStep('success');
        setTimeout(() => {
            placeOrder();
        }, 2000);
    }, 2000);
  };

  const handleSaveAddress = async () => {
    if (!newAddress.address_line1.trim() || !newAddress.city.trim() || 
        !newAddress.state.trim() || !newAddress.pincode.trim()) {
      showToastMessage('Please fill all required fields', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('customerToken');
      const url = editingAddress 
        ? `${config.API_URL}/api/customer/address/${editingAddress.id}`
        : `${config.API_URL}/api/customer/address`;
      
      const method = editingAddress ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAddress)
      });

      const data = await response.json();

      if (data.success) {
        setShowAddressForm(false);
        setEditingAddress(null);
        setNewAddress({
          address_type: 'home',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          pincode: '',
          is_default: false
        });
        await fetchAddresses(); // Refresh addresses
        showToastMessage(editingAddress ? 'Address updated!' : 'Address added!');
      } else {
        showToastMessage(data.message || 'Failed to save address', 'error');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      showToastMessage('Failed to save address', 'error');
    }
  };

  const placeOrder = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.address) {
        showToastMessage('Please fill all required fields', 'error');
        return;
    }

    const now = new Date();
    const deliveryTime = new Date(now.getTime() + 30 * 60000);

    try {
        const orderData = {
          customer_id: customerData?.id || null,
          customer_name: customerDetails.name,
          customer_phone: customerDetails.phone,
          customer_email: customerDetails.email || '',
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
          payment_method: String(paymentMethod === 'demo' ? 'demo' : 'cod'),
          payment_status: paymentMethod === 'demo' ? 'paid' : 'pending',
          special_instructions: customerDetails.instructions || '',
          delivery_date: new Date().toISOString().split('T')[0],
          delivery_time: deliveryTime.toTimeString().split(' ')[0].substring(0,5),
          is_guest: !isLoggedIn
        };

        const response = await fetch(`${config.API_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (data.success) {
          showToastMessage(`✅ Order placed! ID: ${data.data.order_number}`);
          
          setCart([]);
          setShowCart(false);
          setShowCheckout(false);
          setCustomerDetails({ 
            name: '', 
            phone: '', 
            email: '', 
            address: '', 
            instructions: '' 
          });
          setPaymentMethod('cod');
          
          if (!isLoggedIn) {
            showToastMessage('Save your order by creating an account!');
          }
        } else {
          showToastMessage('Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showToastMessage('Error placing order', 'error');
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
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-4 z-[100] animate-slideDown">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toastMessage}
          </div>
        </div>
      )}

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
              
              {isLoggedIn ? (
                <button
                  onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 bg-white text-orange-500 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden md:inline">{customerData.name?.split(' ')[0] || 'Profile'}</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-2 bg-white text-orange-500 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden md:inline">Login</span>
                </button>
              )}
              
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
          
          <div className="relative mt-3 md:hidden flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search for dishes"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-orange-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white bg-white"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
            
            {isLoggedIn ? (
              <button
                onClick={() => navigate('/profile')}
                className="bg-white text-orange-500 p-2 rounded-lg hover:bg-orange-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="bg-white text-orange-500 p-2 rounded-lg hover:bg-orange-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
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
                            cart.find(i => i.id === item.id) ? (
                              <button
                                onClick={() => setShowCart(true)}
                                className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all duration-300 transform hover:scale-105 flex items-center gap-1"
                              >
                                <span>✓</span> Added
                              </button>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="px-4 py-1.5 border-2 border-orange-500 text-orange-500 rounded-lg text-sm font-medium hover:bg-orange-500 hover:text-white transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                              >
                                ADD
                              </button>
                            )
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

      {/* Login Modal */}
      {showLoginModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[65] animate-fadeIn"
            onClick={() => setShowLoginModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-8 w-full max-w-md z-[70] animate-scaleIn">
            
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-orange-500">ABC Restaurant</h2>
              <p className="text-sm text-gray-500 mt-1">
                Login to continue checkout
              </p>
            </div>

            {/* Cart Summary */}
            <div className="bg-orange-50 p-3 rounded-lg mb-4">
              <p className="text-xs text-gray-600 mb-1">Your cart summary:</p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{cart.length} item{cart.length > 1 ? 's' : ''}</span>
                <span className="text-orange-500 font-bold">₹{grandTotal}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {cart.slice(0, 2).map(item => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
                {cart.length > 2 && <p className="text-gray-400 mt-1">+{cart.length - 2} more items</p>}
              </div>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
                {loginError}
              </div>
            )}

            {/* Login Form */}
            <div className="space-y-6">
              {loginStep === 'mobile' ? (
                // Mobile Number Input
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 bg-gray-100 border rounded-l-lg text-gray-600">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="flex-1 px-4 py-3 border rounded-r-lg focus:outline-none focus:border-orange-500"
                      maxLength="10"
                      disabled={isVerifying}
                    />
                  </div>
                </div>
              ) : (
                // OTP Input
                <div>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    OTP sent to <span className="font-medium">+91 {mobileNumber}</span>
                  </p>
                  
                  <div className="flex justify-center gap-2 mb-4">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (otpInputRefs.current[i] = el)}
                        type="text"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-12 h-12 text-center text-xl border rounded-lg focus:outline-none focus:border-orange-500"
                        maxLength="1"
                        disabled={isVerifying}
                        autoComplete="off"
                      />
                    ))}
                  </div>

                  {/* Development hint */}
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-blue-500 text-center mb-2">
                      Check alert box for OTP
                    </p>
                  )}

                  {/* Resend OTP */}
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-sm text-gray-500">
                        Resend OTP in {timer} seconds
                      </p>
                    ) : (
                      <button
                        onClick={handleResendOtp}
                        disabled={isVerifying}
                        className="text-sm text-orange-500 hover:text-orange-600"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {loginStep === 'mobile' ? (
                <button
                  onClick={handleSendOtp}
                  disabled={isVerifying || mobileNumber.length < 10}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <button
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otp.join('').length < 6}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Login'}
                </button>
              )}

              {/* Continue as Guest */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setCustomerDetails(prev => ({
                      ...prev,
                      phone: mobileNumber || prev.phone
                    }));
                    setShowCheckout(true);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Continue as guest →
                </button>
              </div>
            </div>
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
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-3xl z-[60] max-h-[90vh] overflow-y-auto animate-scaleIn">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-orange-500">Checkout</h2>
              <button 
                onClick={() => {
                  setShowCheckout(false);
                  setShowPayment(false);
                  setPaymentStep('selection');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-medium">1</div>
                <span className="font-medium text-gray-700">Contact</span>
              </div>
              <div className="flex-1 h-0.5 mx-2 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${customerDetails.name && customerDetails.phone ? 'bg-orange-500' : 'bg-gray-300'} text-white flex items-center justify-center font-medium`}>2</div>
                <span className="font-medium text-gray-700">Address</span>
              </div>
              <div className="flex-1 h-0.5 mx-2 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 text-white flex items-center justify-center font-medium">3</div>
                <span className="font-medium text-gray-700">Payment</span>
              </div>
            </div>
            
            {/* 1. Contact Details - First */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">1</span>
                Contact Details
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={customerDetails.name}
                    onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={customerDetails.phone}
                    onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    placeholder="9876543210"
                    required
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* 2. Delivery Address - Second */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">2</span>
                  Delivery Address
                </h3>
                {isLoggedIn && (
                  <button
                    onClick={() => {
                      setShowAddressForm(true);
                      setEditingAddress(null);
                      setNewAddress({
                        address_type: 'home',
                        address_line1: '',
                        address_line2: '',
                        city: '',
                        state: '',
                        pincode: '',
                        is_default: false
                      });
                    }}
                    className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                  >
                    <span>+</span> Add New
                  </button>
                )}
              </div>

              {/* Saved Addresses - Compact Cards */}
              {isLoggedIn && addresses.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setCustomerDetails(prev => ({
                          ...prev,
                          address: `${addr.address_line1}, ${addr.city}, ${addr.state} - ${addr.pincode}`
                        }));
                      }}
                      className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedAddressId === addr.id 
                          ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500' 
                          : 'border-gray-200 hover:border-orange-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              addr.address_type === 'home' ? 'bg-blue-100 text-blue-700' :
                              addr.address_type === 'work' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {addr.address_type}
                            </span>
                            {addr.is_default && (
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate">{addr.address_line1}</p>
                          <p className="text-xs text-gray-500 truncate">{addr.city}, {addr.pincode}</p>
                        </div>
                        {selectedAddressId === addr.id && (
                          <span className="text-orange-500 text-xs">✓</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Address *</label>
                  <textarea
                    value={customerDetails.address}
                    onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                    placeholder="Enter your full address"
                    rows="2"
                    required
                  />
                </div>
              )}

              {/* Special Instructions */}
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Special Instructions (optional)</label>
                <input
                  type="text"
                  value={customerDetails.instructions}
                  onChange={(e) => setCustomerDetails({...customerDetails, instructions: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                  placeholder="Any specific requests? e.g., extra spicy, less oil"
                />
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">3</span>
                Payment Method
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <label 
                  onClick={() => {
                    setPaymentMethod('cod');
                    setShowPayment(false);
                  }}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'cod' 
                      ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
                      : 'border-gray-200 hover:border-orange-200 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === 'cod' ? 'border-orange-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'cod' && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cash on Delivery</p>
                    <p className="text-[10px] text-gray-500">Pay when you receive</p>
                  </div>
                </label>
                
                <label 
                  onClick={() => {
                    setPaymentMethod('demo');
                    setShowPayment(true);
                  }}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'demo' 
                      ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' 
                      : 'border-gray-200 hover:border-orange-200 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    paymentMethod === 'demo' ? 'border-orange-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'demo' && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Online Payment</p>
                    <p className="text-[10px] text-green-600">UPI, Cards, PhonePe</p>
                  </div>
                </label>
              </div>

              {/* Compact Online Payment Section */}
              {paymentMethod === 'demo' && showPayment && (
                <div className="mt-3 bg-white p-3 rounded-lg border border-orange-200">
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">UPI Apps</p>
                    <div className="flex flex-wrap gap-2">
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                        <button
                          key={app}
                          onClick={() => setSelectedUPIApp(app)}
                          className={`px-2 py-1 text-xs border rounded-md transition-all ${
                            selectedUPIApp === app 
                              ? 'border-orange-500 bg-orange-50 text-orange-600' 
                              : 'border-gray-200 hover:border-orange-300'
                          }`}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="px-2 bg-white text-gray-400">or pay with card</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <input
                      type="text"
                      placeholder="Card number"
                      value={cardDetails.number}
                      onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                      className="col-span-2 px-2 py-1 text-xs border rounded focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                      className="px-2 py-1 text-xs border rounded focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                      className="px-2 py-1 text-xs border rounded focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary - Compact */}
            <div className="mb-4 bg-orange-50 p-3 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Items ({cart.length})</span>
                <span className="font-medium">₹{cartTotal}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-600">Delivery</span>
                <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between items-center font-medium pt-2 mt-2 border-t border-orange-200">
                <span>Total</span>
                <span className="text-orange-500 text-lg">₹{grandTotal}</span>
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-2">
                ⏱️ Ready in ~30 mins • Free delivery above ₹499
              </p>
            </div>

            {/* Payment States */}
            {paymentStep === 'processing' && (
              <div className="text-center py-3 mb-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-200 border-t-orange-500 mx-auto mb-2"></div>
                <p className="text-xs text-gray-600">Processing payment...</p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="text-center py-2 bg-green-50 rounded-lg mb-3">
                <p className="text-xs text-green-600 font-medium">✅ Payment Successful! Placing order...</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {paymentMethod === 'cod' && (
                <button 
                  onClick={placeOrder}
                  disabled={!customerDetails.name || !customerDetails.phone || !customerDetails.address}
                  className={`flex-1 py-3 rounded-lg font-medium text-sm transition-all ${
                    customerDetails.name && customerDetails.phone && customerDetails.address
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Place Order • ₹{grandTotal}
                </button>
              )}
              {paymentMethod === 'demo' && paymentStep === 'selection' && (
                <button
                  onClick={handlePaymentSubmit}
                  disabled={!selectedUPIApp && !cardDetails.number}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium text-sm hover:bg-green-600 transition-all"
                >
                  Pay ₹{grandTotal}
                </button>
              )}
              <button 
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                onClick={() => {
                  setShowCheckout(false);
                  setShowPayment(false);
                  setPaymentStep('selection');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Address Form Modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            
            <div className="space-y-4">
              <select
                value={newAddress.address_type}
                onChange={(e) => setNewAddress({...newAddress, address_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="other">Other</option>
              </select>

              <input
                type="text"
                placeholder="Address Line 1 *"
                value={newAddress.address_line1}
                onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              />

              <input
                type="text"
                placeholder="Address Line 2"
                value={newAddress.address_line2}
                onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="City *"
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  placeholder="State *"
                  value={newAddress.state}
                  onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>

              <input
                type="text"
                placeholder="Pincode *"
                value={newAddress.pincode}
                onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
                maxLength="6"
              />

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <span className="text-sm text-gray-700">Set as default address</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveAddress}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
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
        
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
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