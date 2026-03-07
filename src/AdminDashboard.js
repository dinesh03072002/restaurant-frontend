import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import config from './config';

function AdminDashboard({ user, onLogout }) {
    const [menuItems, setMenuItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('menu');
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category_id: 1,
        image: '',
        is_available: true,
        is_vegetarian: false,
        preparation_time: 30
    });

    // Log token on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        console.log('Token on mount:', token ? 'Present' : 'Missing');
        if (!token) {
            alert('No token found. Please login again.');
            onLogout();
        }
    }, [onLogout]);

    // Create axios instance with useMemo
    const api = useMemo(() => axios.create({
        baseURL: config.API_URL,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    }), []);

    // Fetch data function with useCallback
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'menu') {
                const response = await api.get('/api/menu');
                setMenuItems(response.data.data);
            } else if (activeTab === 'orders') {
                const response = await api.get('/api/admin/orders');
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
                onLogout();
            }
        } finally {
            setLoading(false);
        }
    }, [activeTab, api, onLogout]);

    // Use useEffect with proper dependency
    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            if (isMounted) {
                await fetchData();
            }
        };
        
        loadData();
        
        return () => {
            isMounted = false;
        };
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large. Max 5MB allowed.');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        const uploadData = new FormData();
        uploadData.append('image', file);

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                alert('No authentication token found. Please login again.');
                onLogout();
                return;
            }

            const response = await axios.post(`${config.API_URL}/api/admin/upload`, uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setFormData(prev => ({
                    ...prev,
                    image: response.data.data.imageUrl
                }));
                alert('✅ Image uploaded successfully!');
            }
        } catch (error) {
            console.error('Upload error:', error);
            
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
                onLogout();
            } else {
                alert(`❌ Failed to upload image: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await api.put(`/api/admin/menu/${editingItem.id}`, formData);
                alert('✅ Item updated successfully!');
            } else {
                await api.post('/api/admin/menu', formData);
                alert('✅ Item added successfully!');
            }
            await fetchData();
            setShowForm(false);
            setEditingItem(null);
            resetForm();
        } catch (error) {
            console.error('Error saving item:', error);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
                onLogout();
            } else {
                alert('❌ Failed to save item');
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            try {
                await api.delete(`/api/admin/menu/${id}`);
                await fetchData();
                alert('✅ Item deleted successfully!');
            } catch (error) {
                console.error('Error deleting item:', error);
                if (error.response?.status === 401) {
                    alert('Session expired. Please login again.');
                    onLogout();
                } else {
                    alert('❌ Failed to delete item');
                }
            }
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price,
            category_id: item.category_id,
            image: item.image,
            is_available: item.is_available,
            is_vegetarian: item.is_vegetarian,
            preparation_time: item.preparation_time
        });
        setShowForm(true);
    };

    const handleStatusUpdate = async (orderId, status) => {
        try {
            await api.put(`/api/admin/orders/${orderId}/status`, { status });
            
            // Refresh the orders list
            await fetchData();
            
            // If the currently viewed order is the one being updated, update it too
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({
                    ...selectedOrder,
                    order_status: status
                });
            }
            
            alert('✅ Order status updated!');
        } catch (error) {
            console.error('Error updating order:', error);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
                onLogout();
            } else {
                alert('❌ Failed to update status');
            }
        }
    };

    const handleViewOrder = (order) => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price: '',
            category_id: 1,
            image: '',
            is_available: true,
            is_vegetarian: false,
            preparation_time: 30
        });
    };

    // Helper function to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold">ABC Restaurant Admin</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm">Welcome, {user?.name}</span>
                            <button 
                                onClick={onLogout}
                                className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-300 text-sm font-medium"
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
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('menu')}
                            className={`px-6 py-3 text-sm font-medium transition-all duration-300 border-b-2 ${
                                activeTab === 'menu'
                                    ? 'border-orange-500 text-orange-500'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Menu Items
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-6 py-3 text-sm font-medium transition-all duration-300 border-b-2 ${
                                activeTab === 'orders'
                                    ? 'border-orange-500 text-orange-500'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Orders
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'menu' && (
                    <div className="space-y-6">
                        {/* Header with Add Button */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-800">Menu Items</h2>
                            <button
                                onClick={() => {
                                    setEditingItem(null);
                                    resetForm();
                                    setShowForm(true);
                                }}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center gap-2 text-sm"
                            >
                                <span>+</span> Add New Item
                            </button>
                        </div>

                        {/* Add/Edit Form Modal */}
                        {showForm && (
                            <>
                                <div 
                                    className="fixed inset-0 bg-black bg-opacity-50 z-50"
                                    onClick={() => setShowForm(false)}
                                />
                                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
                                    <h3 className="text-xl font-bold text-orange-500 mb-6">
                                        {editingItem ? 'Edit Item' : 'Add New Item'}
                                    </h3>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                                                placeholder="Enter item name"
                                                required
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                                                placeholder="Enter item description"
                                                rows="2"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                                                    placeholder="0"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                                <select
                                                    name="category_id"
                                                    value={formData.category_id}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                                                    required
                                                >
                                                    <option value="1">Biryani</option>
                                                    <option value="2">Starters</option>
                                                    <option value="3">Main Course</option>
                                                    <option value="4">Breads</option>
                                                    <option value="5">Drinks</option>
                                                    <option value="6">Desserts</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Image Upload Section */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-orange-500 transition-colors">
                                                {formData.image && (
                                                    <div className="mb-4">
                                                        <img 
                                                            src={formData.image} 
                                                            alt="Preview" 
                                                            className="w-32 h-32 object-cover rounded-lg mx-auto border border-gray-200"
                                                        />
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center justify-center w-full">
                                                    <label className="w-full flex flex-col items-center px-4 py-6 bg-white rounded-lg shadow-lg tracking-wide border border-orange-500 cursor-pointer hover:bg-orange-500 hover:text-white transition-all duration-300">
                                                        <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                            <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
                                                        </svg>
                                                        <span className="mt-2 text-base leading-normal">
                                                            {uploading ? 'Uploading...' : 'Choose File'}
                                                        </span>
                                                        <input 
                                                            type='file' 
                                                            className="hidden" 
                                                            accept="image/*"
                                                            onChange={handleFileUpload}
                                                            disabled={uploading}
                                                        />
                                                    </label>
                                                </div>
                                                
                                                {uploading && (
                                                    <div className="mt-4 text-center">
                                                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
                                                        <p className="text-sm text-orange-500 mt-2">Uploading...</p>
                                                    </div>
                                                )}
                                                
                                                <div className="relative my-4">
                                                    <div className="absolute inset-0 flex items-center">
                                                        <div className="w-full border-t border-gray-300"></div>
                                                    </div>
                                                    <div className="relative flex justify-center text-sm">
                                                        <span className="px-2 bg-white text-gray-500">OR</span>
                                                    </div>
                                                </div>
                                                
                                                <input
                                                    type="text"
                                                    name="image"
                                                    value={formData.image}
                                                    onChange={handleInputChange}
                                                    placeholder="Enter image URL"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                                                />
                                            </div>
                                            <small className="text-gray-500">Supported: JPG, PNG, GIF (Max 5MB)</small>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (mins)</label>
                                                <input
                                                    type="number"
                                                    name="preparation_time"
                                                    value={formData.preparation_time}
                                                    onChange={handleInputChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
                                                    placeholder="30"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="is_available"
                                                    checked={formData.is_available}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                                />
                                                <span className="text-sm text-gray-700">Available</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name="is_vegetarian"
                                                    checked={formData.is_vegetarian}
                                                    onChange={handleInputChange}
                                                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                                />
                                                <span className="text-sm text-gray-700">Vegetarian</span>
                                            </label>
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button 
                                                type="submit" 
                                                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-all duration-300"
                                                disabled={uploading}
                                            >
                                                {uploading ? 'Uploading...' : (editingItem ? 'Update Item' : 'Add Item')}
                                            </button>
                                            <button 
                                                type="button" 
                                                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-all duration-300"
                                                onClick={() => {
                                                    setShowForm(false);
                                                    setEditingItem(null);
                                                    resetForm();
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        )}

                        {/* Menu Items Table */}
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {menuItems.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    <img 
                                                        src={item.image || 'https://via.placeholder.com/40'} 
                                                        alt={item.name}
                                                        className="w-10 h-10 rounded-lg object-cover"
                                                        onError={(e) => {
                                                            e.target.src = 'https://via.placeholder.com/40';
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-6 py-2">
                                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-xs">{item.description}</div>
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-orange-500">₹{item.price}</div>
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            item.is_available 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {item.is_available ? 'Available' : 'Unavailable'}
                                                        </span>
                                                        {item.is_vegetarian && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                Veg
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="text-blue-600 hover:text-blue-900 mr-3 font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-red-600 hover:text-red-900 font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800">Orders</h2>
                        
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {orders.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                                        No orders found
                                                    </td>
                                                </tr>
                                            ) : (
                                                orders.map(order => (
                                                    <tr key={order.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {order.order_number}
                                                        </td>
                                                        <td className="px-6 py-2">
                                                            <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {order.customer_phone}<br/>
                                                                <span className="text-gray-400">
                                                                    {formatDate(order.created_at)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                                                            {order.items?.length || 0} items
                                                        </td>
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-orange-500">
                                                            ₹{order.total}
                                                        </td>
                                                        <td className="px-6 py-2 whitespace-nowrap">
                                                            <select
                                                                value={order.order_status}
                                                                onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                                className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-orange-500"
                                                            >
                                                                <option value="pending">Pending</option>
                                                                <option value="confirmed">Confirmed</option>
                                                                <option value="preparing">Preparing</option>
                                                                <option value="ready">Ready</option>
                                                                <option value="out_for_delivery">Out for Delivery</option>
                                                                <option value="delivered">Delivered</option>
                                                                <option value="cancelled">Cancelled</option>
                                                            </select>
                                                        </td>
                                                        <td className="px-6 py-2 whitespace-nowrap text-sm">
                                                            <button 
                                                                onClick={() => handleViewOrder(order)}
                                                                className="text-orange-500 hover:text-orange-700 font-medium"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Order Details Modal */}
            {showOrderDetails && selectedOrder && (
                <>
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-50"
                        onClick={() => setShowOrderDetails(false)}
                    />
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-orange-500">Order Details</h3>
                            <button 
                                onClick={() => setShowOrderDetails(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Order Info */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-3">Order Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Order Number:</span>
                                        <p className="font-medium">{selectedOrder.order_number}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Order Date:</span>
                                        <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Payment Method:</span>
                                        <p className="font-medium uppercase">{selectedOrder.payment_method || 'COD'}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Payment Status:</span>
                                        <p className={`font-medium capitalize ${
                                            selectedOrder.payment_status === 'paid' ? 'text-green-600' : 
                                            selectedOrder.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {selectedOrder.payment_status || 'pending'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Order Status:</span>
                                        <p className={`font-medium capitalize ${
                                            selectedOrder.order_status === 'delivered' ? 'text-green-600' : 
                                            selectedOrder.order_status === 'cancelled' ? 'text-red-600' : 
                                            selectedOrder.order_status === 'out_for_delivery' ? 'text-blue-600' : 
                                            selectedOrder.order_status === 'preparing' ? 'text-orange-500' : 
                                            selectedOrder.order_status === 'confirmed' ? 'text-purple-600' : 
                                            selectedOrder.order_status === 'ready' ? 'text-teal-600' : 
                                            'text-yellow-600'
                                        }`}>
                                            {selectedOrder.order_status?.replace(/_/g, ' ') || 'pending'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Details */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-3">Customer Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">Name:</span>
                                        <p className="font-medium">{selectedOrder.customer_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Phone:</span>
                                        <p className="font-medium">{selectedOrder.customer_phone}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Address:</span>
                                        <p className="font-medium">{selectedOrder.customer_address}</p>
                                    </div>
                                    {selectedOrder.special_instructions && (
                                        <div>
                                            <span className="text-gray-500">Special Instructions:</span>
                                            <p className="font-medium">{selectedOrder.special_instructions}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-3">Order Items</h4>
                                <div className="space-y-2">
                                    {selectedOrder.items && selectedOrder.items.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2 last:border-0">
                                            <div>
                                                <span className="font-medium">{item.item_name}</span>
                                                <span className="text-gray-500 ml-2">x{item.quantity}</span>
                                            </div>
                                            <span className="font-medium">₹{item.subtotal}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bill Summary */}
                            <div className="bg-gray-100 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-700 mb-3">Bill Summary</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-medium">₹{selectedOrder.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Delivery Fee:</span>
                                        <span className="font-medium">₹{selectedOrder.delivery_fee}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300">
                                        <span>Total:</span>
                                        <span className="text-orange-500">₹{selectedOrder.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowOrderDetails(false)}
                                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Animation Styles */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
                    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

export default AdminDashboard;