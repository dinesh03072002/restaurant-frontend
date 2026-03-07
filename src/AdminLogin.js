import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from './config'; // Add this import

function AdminLogin({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // CHANGE THIS:
            // const response = await axios.post('http://localhost:5000/api/auth/login', {
            
            // TO THIS:
            const response = await axios.post(`${config.API_URL}/api/auth/login`, {
                email,
                password
            });

            if (response.data.success) {
                localStorage.setItem('token', response.data.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.data.user));
                onLogin(response.data.data.user);
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || 'Login failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-3xl font-bold text-orange-500 text-center mb-2">Admin Login</h2>
                <p className="text-gray-500 text-center mb-8">Access your dashboard</p>
                
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="admin@restaurant.com"
                            required
                        />
                    </div>
                    
                    <div className="mb-8">
                        <label className="block text-gray-700 font-medium mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
               
            </div>
        </div>
    );
}

export default AdminLogin;