import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerApp from './CustomerApp';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check localStorage on mount
    useEffect(() => {
        const checkAuth = () => {
            const savedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            
            if (savedUser && token) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    // Invalid user data, clear storage
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        
        checkAuth();
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-orange-500"></div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<CustomerApp />} />
                
                {/* Login route - accessible even when logged in */}
                <Route 
                    path="/login" 
                    element={<AdminLogin onLogin={handleLogin} />} 
                />
                
                {/* Dashboard route - protected */}
                <Route 
                    path="/dashboard" 
                    element={
                        user ? (
                            <AdminDashboard user={user} onLogout={handleLogout} />
                        ) : (
                            <Navigate to="/login" replace />
                        )
                    } 
                />
                
                {/* Catch all - redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;