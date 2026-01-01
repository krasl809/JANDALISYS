import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PERMISSIONS } from '../../config/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { hasPermission, isAuthenticated } = useAuth();
  const location = useLocation();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if specific permission is required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    // Redirect to dashboard if user doesn't have required permission
    return <Navigate to="/" replace />;
  }

  // Check route-based permissions
  const routePermission = ROUTE_PERMISSIONS[location.pathname];
  if (routePermission && !hasPermission(routePermission)) {
    // Redirect to dashboard if user doesn't have route permission
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;