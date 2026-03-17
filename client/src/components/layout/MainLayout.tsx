import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, CssBaseline, useTheme, IconButton, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

import Header from '../common/Header';
import Navigation from './Navigation';

const drawerWidth = 280;

// Pages where sidebar should be collapsed by default
const SIDEBAR_COLLAPSED_PAGES = ['/hr/attendance'];

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    // Check if current page should have collapsed sidebar
    const shouldCollapse = SIDEBAR_COLLAPSED_PAGES.some(page => 
      location.pathname.startsWith(page)
    );
    if (shouldCollapse) return true;
    
    // Otherwise, check localStorage for user preference
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const isRTL = i18n.language.startsWith('ar');

  // Update sidebar state when route changes
  useEffect(() => {
    const shouldCollapse = SIDEBAR_COLLAPSED_PAGES.some(page => 
      location.pathname.startsWith(page)
    );
    if (shouldCollapse) {
      setSidebarCollapsed(true);
    }
  }, [location.pathname]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('sidebarCollapsed', String(newValue));
  };

  return (
    <Box 
      dir={isRTL ? 'rtl' : 'ltr'} 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        overflowX: 'hidden' 
      }}
    >
      <CssBaseline />

      {/* القائمة الجانبية - يمكن إخفاءها على سطح المكتب tetapi tetap tersedia untuk mobile */}
      <Navigation
        width={drawerWidth}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* منطقة المحتوى الرئيسية */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
          width: sidebarCollapsed ? '100%' : `calc(100% - ${drawerWidth}px)`,
          maxWidth: sidebarCollapsed ? '100%' : `calc(100% - ${drawerWidth}px)`,
          transition: 'width 0.3s ease, max-width 0.3s ease',
          overflowX: 'hidden'
        }}
      >
        <Header 
          handleDrawerToggle={handleDrawerToggle}
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
        />

        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 },
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;