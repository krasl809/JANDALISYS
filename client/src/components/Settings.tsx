import React, { useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  alpha,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Inventory as InventoryIcon,
  People as PeopleIcon,
  LocalShipping as ShippingIcon,
  Description as DocumentIcon,
  Payment as PaymentIcon,
  Gavel as IncotermIcon,
  BusinessCenter as BrokerIcon,
  BusinessCenter
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load components to prevent circular dependencies
const ArticlesList = lazy(() => import('./lists/ArticlesList'));
const BuyersList = lazy(() => import('./lists/BuyersList'));
const SellersList = lazy(() => import('./lists/SellersList'));
const BrokersList = lazy(() => import('./lists/BrokersList'));
const ShippersList = lazy(() => import('./lists/ShippersList'));
const AgentsList = lazy(() => import('./lists/AgentsList'));
const DocumentsList = lazy(() => import('./lists/DocumentsList'));
const PaymentTermsList = lazy(() => import('./lists/PaymentTermsList'));
const IncotermsList = lazy(() => import('./lists/IncotermsList'));
const UserManagementNew = lazy(() => import('./lists/user_management/UserManagementNew'));
const ProfileSettings = lazy(() => import('./auth/ProfileSettings'));

// Loading fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
    <CircularProgress />
  </Box>
);

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, hasPermission } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const isAdmin = user?.role === 'admin';

  const allTabs = [
    { label: t('My Profile') || 'My Profile', icon: <PeopleIcon />, component: <ProfileSettings /> },
    { label: t('User & Access') || 'User & Access', icon: <PeopleIcon />, component: <UserManagementNew />, adminOnly: true },
    { label: t('Articles'), icon: <InventoryIcon />, component: <ArticlesList />, permission: 'read_articles' },
    { label: t('Buyers'), icon: <PeopleIcon />, component: <BuyersList />, permission: 'read_buyers' },
    { label: t('Sellers'), icon: <PeopleIcon />, component: <SellersList />, permission: 'read_sellers' },
    { label: t('Brokers'), icon: <BrokerIcon />, component: <BrokersList />, permission: 'read_brokers' },
    { label: t('Shippers'), icon: <ShippingIcon />, component: <ShippersList />, permission: 'read_shippers' },
    { label: t('Agents'), icon: <BusinessCenter />, component: <AgentsList />, permission: 'view_agents' },
    { label: t('Documents'), icon: <DocumentIcon />, component: <DocumentsList />, permission: 'read_document_types' },
    { label: t('Payment Terms'), icon: <PaymentIcon />, component: <PaymentTermsList />, permission: 'read_payment_terms' },
    { label: t('Incoterms'), icon: <IncotermIcon />, component: <IncotermsList />, permission: 'read_incoterms' },
  ];

  const tabs = allTabs.filter(tab => {
    if (tab.adminOnly && !isAdmin) return false;
    if (tab.permission && !hasPermission(tab.permission)) return false;
    return true;
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>

      {/* 1. Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, color: 'primary.main' }}>
            <SettingsIcon fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary">
              {t('System Settings')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage global configurations, definitions, and user roles.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 2. Tabs & Content */}
      <Card
        sx={{
          minHeight: 600,
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' } // عمودي للجوال، أفقي للشاشات الكبيرة
        }}
      >
        {/* Sidebar Tabs (Desktop) / Scrollable Tabs (Mobile) */}
        <Box
          sx={{
            width: { xs: '100%', md: 260 },
            borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
            borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
            bgcolor: alpha(theme.palette.background.default, 0.5)
          }}
        >
          <Tabs
            orientation={isMobile ? "horizontal" : "vertical"}
            variant="scrollable"
            scrollButtons="auto"
            value={currentTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTabs-indicator': {
                left: 0,
                width: 3,
                bgcolor: 'primary.main',
                borderRadius: '0 4px 4px 0'
              },
              '& .MuiTab-root': {
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start',
                minHeight: 56,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                gap: 1.5,
                px: 3,
                transition: 'all 0.2s',
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
                '&:hover:not(.Mui-selected)': {
                  bgcolor: alpha(theme.palette.text.primary, 0.04)
                }
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>
        </Box>

        {/* Content Area with Animation */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 2, md: 4 }, flexGrow: 1 }}>

            {/* Header for Mobile only */}
            {isMobile && (
              <Typography variant="h6" fontWeight="700" color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {tabs[currentTab].icon} {tabs[currentTab].label}
              </Typography>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ width: '100%', height: '100%' }}
              >
                <Suspense fallback={<LoadingFallback />}>
                  {tabs[currentTab].component}
                </Suspense>
              </motion.div>
            </AnimatePresence>

          </CardContent>
        </Box>
      </Card>
    </Container>
  );
};

export default SettingsPage;