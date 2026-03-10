import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from './config';

function CustomerProfile() {
    const [customer, setCustomer] = useState(null);
    const [addresses, setAddresses] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success');
    const [newAddress, setNewAddress] = useState({
        address_type: 'home',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        is_default: false
    });

    const navigate = useNavigate();
    const token = localStorage.getItem('customerToken');

    const showToastMessage = (message, type = 'success') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Use useCallback to memoize fetchCustomerData
    const fetchCustomerData = useCallback(async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            
            console.log('Fetching customer data...');
            
            const [profileRes, addressesRes, ordersRes] = await Promise.all([
                fetch(`${config.API_URL}/api/customer/profile`, { headers }),
                fetch(`${config.API_URL}/api/customer/addresses`, { headers }),
                fetch(`${config.API_URL}/api/customer/orders`, { headers })
            ]);

            const profile = await profileRes.json();
            const addr = await addressesRes.json();
            const ord = await ordersRes.json();

            if (profile.success) setCustomer(profile.data);
            if (addr.success) setAddresses(addr.data || []);
            if (ord.success) setOrders(ord.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showToastMessage('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    }, [token]); // Only depends on token

    // Fixed useEffect with proper dependencies
    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }
        fetchCustomerData();
    }, [token, navigate, fetchCustomerData]); // Added all dependencies

    const formatOrderDate = (dateString) => {
        const options = {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        
        if (!dateString) return new Date().toLocaleString('en-IN', options);
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) 
                ? new Date().toLocaleString('en-IN', options)
                : date.toLocaleString('en-IN', options);
        } catch {
            return new Date().toLocaleString('en-IN', options);
        }
    };

    const handleSaveAddress = async () => {
        if (!newAddress.address_line1.trim()) {
            showToastMessage('Address line 1 is required', 'error');
            return;
        }
        if (!newAddress.city.trim()) {
            showToastMessage('City is required', 'error');
            return;
        }
        if (!newAddress.state.trim()) {
            showToastMessage('State is required', 'error');
            return;
        }
        if (!newAddress.pincode.trim() || newAddress.pincode.length !== 6) {
            showToastMessage('Valid 6-digit pincode is required', 'error');
            return;
        }

        setLoading(true);
        try {
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
                setShowAddAddress(false);
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
                await fetchCustomerData();
                showToastMessage(editingAddress ? 'Address updated!' : 'Address added!');
            } else {
                showToastMessage(data.message || 'Failed to save address', 'error');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            showToastMessage('Failed to save address', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAddress = async (id) => {
        if (!window.confirm('Delete this address?')) return;
        
        try {
            const response = await fetch(`${config.API_URL}/api/customer/address/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchCustomerData();
                showToastMessage('Address deleted');
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            showToastMessage('Failed to delete address', 'error');
        }
    };

    const handleSetDefault = async (id) => {
        try {
            const response = await fetch(`${config.API_URL}/api/customer/address/${id}/default`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchCustomerData();
                showToastMessage('Default address updated');
            }
        } catch (error) {
            console.error('Error setting default:', error);
            showToastMessage('Failed to update default address', 'error');
        }
    };

    const handleUpdateName = async () => {
        if (!customer.name.trim()) {
            showToastMessage('Name cannot be empty', 'error');
            return;
        }

        try {
            const response = await fetch(`${config.API_URL}/api/customer/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: customer.name })
            });

            if (response.ok) {
                const storedCustomer = JSON.parse(localStorage.getItem('customer') || '{}');
                storedCustomer.name = customer.name;
                localStorage.setItem('customer', JSON.stringify(storedCustomer));
                window.dispatchEvent(new Event('storage'));
                showToastMessage('Profile updated!');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showToastMessage('Failed to update profile', 'error');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('customerToken');
        localStorage.removeItem('customer');
        localStorage.removeItem('pendingCart');
        localStorage.removeItem('checkoutIntent');
        window.dispatchEvent(new Event('storage'));
        navigate('/');
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-20 right-4 z-[100] animate-slideDown">
                    <div className={`${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {toastType === 'success' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                        </svg>
                        {toastMessage}
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-orange-500 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">My Account</h1>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
                            >
                                Home
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-6">
                        {['profile', 'addresses', 'orders'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-4 text-sm font-medium border-b-2 capitalize transition-colors ${
                                    activeTab === tab
                                        ? 'border-orange-500 text-orange-500'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {tab === 'profile' ? 'Profile' : 
                                 tab === 'addresses' ? 'Saved Addresses' : 'Order History'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Tab */}
                {activeTab === 'profile' && customer && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
                        <div className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={customer.name || ''}
                                    onChange={(e) => setCustomer({...customer, name: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Mobile Number</label>
                                <p className="text-lg font-medium">{customer.mobile}</p>
                            </div>
                            <button
                                onClick={handleUpdateName}
                                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Addresses Tab */}
                {activeTab === 'addresses' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Saved Addresses</h2>
                            <button
                                onClick={() => {
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
                                    setShowAddAddress(true);
                                }}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                            >
                                <span>+</span> Add New
                            </button>
                        </div>

                       

                        {addresses.length === 0 && !showAddAddress && (
                            <div className="text-center py-8 text-gray-500">
                                <p>No addresses saved yet.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {addresses.map(address => (
                                <div key={address.id} className="border rounded-lg p-4 relative">
                                    {address.is_default && (
                                        <span className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                            DEFAULT
                                        </span>
                                    )}
                                    <span className={`inline-block px-2 py-1 rounded text-xs mb-2 ${
                                        address.address_type === 'home' ? 'bg-blue-100 text-blue-700' :
                                        address.address_type === 'work' ? 'bg-purple-100 text-purple-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {address.address_type.toUpperCase()}
                                    </span>
                                    <p className="text-sm">{address.address_line1}</p>
                                    {address.address_line2 && <p className="text-sm">{address.address_line2}</p>}
                                    <p className="text-sm">{address.city}, {address.state} - {address.pincode}</p>
                                    
                                    <div className="flex gap-3 mt-3 pt-3 border-t">
                                        {!address.is_default && (
                                            <button
                                                onClick={() => handleSetDefault(address.id)}
                                                className="text-sm text-orange-500 hover:text-orange-600"
                                            >
                                                Set Default
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setEditingAddress(address);
                                                setNewAddress(address);
                                                setShowAddAddress(true);
                                            }}
                                            className="text-sm text-blue-500 hover:text-blue-600"
                                        >
                                            Edit
                                        </button>
                                        {!address.is_default && (
                                            <button
                                                onClick={() => handleDeleteAddress(address.id)}
                                                className="text-sm text-red-500 hover:text-red-600"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add/Edit Address Modal */}
                        {showAddAddress && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                                    <h3 className="text-xl font-bold mb-4">
                                        {editingAddress ? 'Edit Address' : 'Add New Address'}
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <select
                                            value={newAddress.address_type}
                                            onChange={(e) => setNewAddress({...newAddress, address_type: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-lg"
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
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />

                                        <input
                                            type="text"
                                            placeholder="Address Line 2"
                                            value={newAddress.address_line2}
                                            onChange={(e) => setNewAddress({...newAddress, address_line2: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                placeholder="City *"
                                                value={newAddress.city}
                                                onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                                                className="px-3 py-2 border rounded-lg"
                                            />
                                            <input
                                                type="text"
                                                placeholder="State *"
                                                value={newAddress.state}
                                                onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                                                className="px-3 py-2 border rounded-lg"
                                            />
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Pincode *"
                                            value={newAddress.pincode}
                                            onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            maxLength="6"
                                        />

                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={newAddress.is_default}
                                                onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                                                className="w-4 h-4 text-orange-500"
                                            />
                                            <span className="text-sm">Set as default address</span>
                                        </label>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={handleSaveAddress}
                                                disabled={loading}
                                                className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowAddAddress(false);
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
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-semibold mb-6">My Orders</h2>
                        
                        {orders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <p className="text-lg">No orders yet</p>
                                <p className="text-sm mt-2">When you place orders, they will appear here</p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                                >
                                    Browse Menu
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <div key={order.id} className="border rounded-lg p-4 hover:shadow-md">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium text-lg">Order #{order.order_number}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatOrderDate(order.created_at)}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                order.order_status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                order.order_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                order.order_status === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
                                                order.order_status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {order.order_status?.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        
                                        <div className="mt-3 border-t pt-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium">Items:</span>
                                                <span className="text-sm text-gray-600">₹{order.subtotal}</span>
                                            </div>
                                            {order.items?.map(item => (
                                                <div key={item.id} className="flex justify-between items-center text-sm text-gray-600 ml-4">
                                                    <span>{item.item_name} x{item.quantity}</span>
                                                    <span>₹{item.subtotal}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t text-sm">
                                                <span>Delivery Fee:</span>
                                                <span className={order.delivery_fee === 0 ? 'text-green-600' : ''}>
                                                    {order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 font-medium">
                                                <span>Total:</span>
                                                <span className="text-orange-500">₹{order.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style>{`
                @keyframes slideDown {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

export default CustomerProfile;