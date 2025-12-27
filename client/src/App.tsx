import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppThemeProvider } from './context/ThemeContext';
import { CircularProgress, Box } from '@mui/material';

// Eagerly load essential components
import PrivateRoute from './components/auth/PrivateRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './components/layout/Dashboard';

// Lazy load page components
const Reports = lazy(() => import('./components/pages/Reports'));
const ContractList = lazy(() => import('./components/contracts/ContractList'));
const ContractForm = lazy(() => import('./components/contracts/ContractForm'));
const ContractLifecycle = lazy(() => import('./components/contracts/ContractLifecycle'));
const PricingForm = lazy(() => import('./components/pages/PricingForm'));
const PaymentForm = lazy(() => import('./components/pages/PaymentForm'));
const DeliveryForm = lazy(() => import('./components/pages/DeliveryForm'));
const Settings = lazy(() => import('./components/Settings'));
const ArticlesList = lazy(() => import('./components/lists/ArticlesList'));
const SellersList = lazy(() => import('./components/lists/SellersList'));
const ShippersList = lazy(() => import('./components/lists/ShippersList'));
const BuyersList = lazy(() => import('./components/lists/BuyersList'));
const AgentsList = lazy(() => import('./components/lists/AgentsList'));
const WarehouseList = lazy(() => import('./components/inventory/WarehouseList'));
const StockList = lazy(() => import('./components/inventory/StockList'));
const DeliveryNoteList = lazy(() => import('./components/inventory/DeliveryNoteList'));
const InventoryDashboard = lazy(() => import('./components/inventory/InventoryDashboard'));
const DeliveryNoteForm = lazy(() => import('./components/inventory/DeliveryNoteForm'));

// HR Imports
const HrDashboard = lazy(() => import('./pages/hr/HrDashboard'));
const AttendancePage = lazy(() => import('./pages/hr/AttendancePage'));

const DevicesPage = lazy(() => import('./pages/hr/DevicesPage'));
const ShiftSettingsPage = lazy(() => import('./pages/hr/ShiftSettingsPage'));
const EmployeeList = lazy(() => import('./pages/hr/EmployeeList'));

// Employee Management Imports
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const AddEmployeePage = lazy(() => import('./pages/employees/AddEmployeePage'));
const EditEmployeePage = lazy(() => import('./pages/employees/EditEmployeePage'));
const EmployeeForm = lazy(() => import('./components/employees/EmployeeForm'));
const EmployeeImport = lazy(() => import('./pages/hr/EmployeeImport'));
const ServerOffline = lazy(() => import('./components/pages/ServerOffline'));

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <AppThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* 1. Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/offline" element={<ServerOffline />} />

            {/* 2. Protected Routes */}
            <Route element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              <Route path="/" element={<Dashboard />} />

              {/* Contracts */}
              <Route path="/contracts" element={<ContractList />} />
              <Route path="/contracts/new" element={<ContractForm />} />
              <Route path="/contracts/:id/edit" element={<ContractForm />} />
              <Route path="/reports" element={<Reports />} />
              {/* ✅ إصلاح: إعادة توجيه المسار الرئيسي لعرض تفاصيل العقد */}
              <Route path="/contracts/:id" element={<ContractForm />} />
              {/* ✅ تحسين: تخصيص مسار واضح لمتابعة دورة حياة العقد */}
              <Route path="/contracts/:id/lifecycle" element={<ContractLifecycle />} />

              {/* Inventory */}
              <Route path="/inventory/dashboard" element={<InventoryDashboard />} />
              <Route path="/inventory/warehouses" element={<WarehouseList />} />
              <Route path="/inventory/stock" element={<StockList />} />
              <Route path="/inventory/movements" element={<DeliveryNoteList />} />
              <Route path="/inventory/movements/new" element={<DeliveryNoteForm />} />

              {/* Other */}
              <Route path="/pricing" element={<PricingForm />} />
              <Route path="/payments" element={<PaymentForm />} />
              <Route path="/delivery" element={<DeliveryForm />} />

              {/* Settings */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/articles" element={<ArticlesList />} />
              <Route path="/settings/sellers" element={<SellersList />} />
              <Route path="/settings/shippers" element={<ShippersList />} />
              <Route path="/settings/buyers" element={<BuyersList />} />
              <Route path="/settings/agents" element={<AgentsList />} />

              {/* HR Module */}
              <Route path="/hr" element={<ProtectedRoute><HrDashboard /></ProtectedRoute>} />
              <Route path="/hr/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />

              <Route path="/hr/devices" element={<ProtectedRoute><DevicesPage /></ProtectedRoute>} />
              <Route path="/hr/shifts" element={<ProtectedRoute><ShiftSettingsPage /></ProtectedRoute>} />

              {/* Employee Management - New System */}
              <Route path="/employees" element={<ProtectedRoute><EmployeesPage /></ProtectedRoute>} />
              <Route path="/employees/import" element={<ProtectedRoute><EmployeeImport /></ProtectedRoute>} />
              <Route path="/employees/add" element={<ProtectedRoute><AddEmployeePage /></ProtectedRoute>} />
              <Route path="/employees/edit/:id" element={<ProtectedRoute><EditEmployeePage /></ProtectedRoute>} />
              <Route path="/employees/:id" element={<ProtectedRoute><EmployeeForm /></ProtectedRoute>} />

              {/* Legacy Employee Route - Redirect to New System */}
              <Route path="/hr/employees" element={<Navigate to="/employees" replace />} />
            </Route>

            {/* 3. 404 Catch All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AppThemeProvider>
  );
}

export default App;
