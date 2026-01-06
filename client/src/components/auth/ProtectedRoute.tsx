import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTE_PERMISSIONS } from '../../config/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { hasPermission, isAuthenticated, user } = useAuth();
  const location = useLocation();

  console.log("🛡️ ProtectedRoute Check:", {
    path: location.pathname,
    isAuthenticated,
    userEmail: user?.email,
    requiredPermission,
    routePermission: ROUTE_PERMISSIONS[location.pathname]
  });

  // Check if user is authenticated
  if (!isAuthenticated) {
    console.warn("🚫 Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if specific permission is required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.warn(`🚫 Missing required permission: ${requiredPermission}`);
    return <Navigate to="/" replace />;
  }

  // Check route-based permissions
  const routePermission = ROUTE_PERMISSIONS[location.pathname];
  if (routePermission && !hasPermission(routePermission)) {
    console.warn(`🚫 Missing route permission: ${routePermission}`);
    return <Navigate to="/" replace />;
  }

  console.log("✅ ProtectedRoute: Access granted");
  return <>{children}</>;
};

export default ProtectedRoute;