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
  const isRTL = i18n.language === 'ar';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box dir={isRTL ? 'rtl' : 'ltr'} sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden' }}>
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
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          marginInlineStart: { md: `${drawerWidth}px` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Header handleDrawerToggle={handleDrawerToggle} />

        <Box
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3, md: 4 }, // 👈 إضافة بادينج متناسق
            width: '100%',
            maxWidth: '1600px', // 👈 تحديد العرض الأقصى للمحتوى
            mx: 'auto',
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