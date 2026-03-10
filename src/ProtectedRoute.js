import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const token = localStorage.getItem('customerToken');
    
    if (!token) {
        // Save the current location to redirect back after login
        return <Navigate to="/login" replace />;
    }
    
    return children;
}

export default ProtectedRoute;