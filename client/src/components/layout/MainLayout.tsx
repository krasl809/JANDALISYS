import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';

import Header from '../common/Header';
import Navigation from './Navigation';

const drawerWidth = 280;

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isRTL = i18n.language.startsWith('ar');

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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

      {/* القائمة الجانبية */}
      <Navigation
        width={drawerWidth}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />

      {/* منطقة المحتوى الرئيسية */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0, // لضمان عدم تمدد الـ flex item بشكل غير متوقع
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Header handleDrawerToggle={handleDrawerToggle} />

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