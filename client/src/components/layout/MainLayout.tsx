import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, CssBaseline, useMediaQuery, useTheme } from '@mui/material';
import { AnimatePresence } from 'framer-motion'; // 👈 مكتبة الحركة
import { useTranslation } from 'react-i18next';

import Header from '../common/Header';
import Navigation from './Navigation';

const drawerWidth = 280;

const MainLayout: React.FC = () => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation(); // 👈 لتحديد مفتاح الحركة
  const isRTL = i18n.language === 'ar';

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box dir={isRTL ? 'rtl' : 'ltr'} sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', overflowX: 'hidden', maxWidth: '100vw', boxSizing: 'border-box' }}>
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
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          // استبدال المارجن اليدوي بـ marginInlineStart ليدعم RTL تلقائياً
          marginInlineStart: { md: `${drawerWidth}px` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          bgcolor: 'background.default',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          maxWidth: '100%',
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
            overflow: 'auto',
            position: 'relative',
            boxSizing: 'border-box',
            overflowX: 'hidden'
          }}
        >
          {/* ✅ تمكين حركات الخروج والدخول عند تغيير المسار */}
          <AnimatePresence mode='wait'>
            {/* نمرر location.pathname كمفتاح ليعرف React أن الصفحة تغيرت */}
            <Outlet key={location.pathname} />
          </AnimatePresence>
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;