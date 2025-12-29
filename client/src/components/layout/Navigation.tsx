import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Collapse, Divider, useTheme
} from '@mui/material';
import {
  Dashboard, Description, Settings, PriceCheck, Payment,
  LocalShipping, ExpandLess, ExpandMore, Circle, Assessment,
  AccessTime, SettingsInputComponent, People, Person, Schedule,
  FolderSpecial
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../config/permissions';

interface NavProps {
  width: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const Navigation: React.FC<NavProps> = ({ width, mobileOpen, handleDrawerToggle }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, hasPermission, isLoading } = useAuth();

  const isRTL = i18n.language === 'ar';
  const [invOpen, setInvOpen] = React.useState(true);
  const [empOpen, setEmpOpen] = React.useState(true);

  // Dynamic Theme Colors
  const sidebarBg = theme.palette.mode === 'dark' ? theme.palette.background.paper : '#0F172A';
  const textActive = theme.palette.primary.main;
  const textInactive = theme.palette.mode === 'dark' ? theme.palette.text.secondary : '#94A3B8';
  const accentColor = theme.palette.primary.main;

  const menuItems = [
    { text: t('dashboard'), path: '/', icon: <Dashboard />, permission: PERMISSIONS.VIEW_DASHBOARD },
    { text: t('contracts'), path: '/contracts', icon: <Description />, permission: PERMISSIONS.VIEW_CONTRACTS },
    { text: t('pricing'), path: '/pricing', icon: <PriceCheck />, permission: PERMISSIONS.VIEW_PRICING },
    { text: t('payments'), path: '/payments', icon: <Payment />, permission: PERMISSIONS.VIEW_PAYMENTS },
    { text: t('Archive Dashboard'), path: '/archive/dashboard', icon: <Dashboard />, permission: PERMISSIONS.VIEW_ARCHIVE },
    { text: t('Electronic Archive'), path: '/archive', icon: <FolderSpecial />, permission: PERMISSIONS.VIEW_ARCHIVE },
    { text: t('Reports & Analytics'), path: '/reports', icon: <Assessment />, permission: PERMISSIONS.VIEW_REPORTS },
  ];

  const inventoryItems = [
    { text: t('Warehouses'), path: '/inventory/warehouses' },
    { text: t('Stock Levels'), path: '/inventory/stock' },
    { text: t('Movements'), path: '/inventory/movements' },
  ];

  // Filter items based on permissions (Admin gets everything via hasPermission check)
  const filteredMenuItems = menuItems.filter(item => {
    const hasPerm = hasPermission(item.permission);
    if (import.meta.env.DEV && user) {
      console.log('Menu item permission check:', { item: item.text, permission: item.permission, hasPerm, userRole: user?.role });
    }
    return hasPerm;
  });
  const showInventory = hasPermission(PERMISSIONS.VIEW_INVENTORY);
  const showSettings = hasPermission(PERMISSIONS.VIEW_SETTINGS);
  
  if (import.meta.env.DEV && !isLoading) {
    console.log('Navigation render state:', {
      user: user,
      filteredMenuItems: filteredMenuItems.length,
      showInventory,
      showSettings,
      permissions: user?.permissions || []
    });
  }

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: sidebarBg, color: textInactive }}>

      {/* Brand */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <motion.div whileHover={{ rotate: 10, scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Box sx={{
            width: 40, height: 40, bgcolor: accentColor, borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: '900', fontSize: '1.2rem',
            boxShadow: `0 0 20px ${alpha(accentColor, 0.4)}`
          }}>
            J
          </Box>
        </motion.div>
        <Box>
          <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff', fontWeight: 700, lineHeight: 1 }}>
            JANDALISYS
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.6, letterSpacing: 1, textTransform: 'uppercase' }}>
            Enterprise Management System
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />

      {/* Menu Items */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
        <List>
          <Typography variant="caption" sx={{ px: 2, mb: 1, display: 'block', fontWeight: 700, fontSize: '0.7rem', opacity: 0.5, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {t('Main Menu')}
          </Typography>

          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={motion.div}
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { navigate(item.path); if (mobileOpen) handleDrawerToggle(); }}
                  sx={{
                    borderRadius: 2,
                    color: isActive ? textActive : textInactive,
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff', bgcolor: 'transparent' }
                  }}
                >
                  {/* ✅ Active Background Animation */}
                  {isActive && (
                    <Box
                      component={motion.div}
                      layoutId="activeNavBackground"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      sx={{
                        position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
                        bgcolor: alpha(accentColor, 0.15), zIndex: 0, borderRadius: 2
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? accentColor : 'inherit', zIndex: 1 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500, zIndex: 1 }}
                    sx={{ textAlign: isRTL ? 'right' : 'left', zIndex: 1 }}
                  />
                  {isActive && (
                    <Box component={motion.div} layoutId="activeIndicator" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accentColor, zIndex: 1 }} />
                  )}
                </ListItemButton>
              </ListItem>
            );
          })}

          <Box sx={{ my: 3 }} />

          {showInventory && (
            <>
              <Typography variant="caption" sx={{ px: 2, mb: 1, display: 'block', fontWeight: 700, fontSize: '0.7rem', opacity: 0.5, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {t('Operations')}
              </Typography>
              {/* ... (inventory items) */}


              <ListItemButton
                onClick={() => setInvOpen(!invOpen)}
                sx={{ borderRadius: 2, mb: 0.5, color: location.pathname.includes('inventory') ? textActive : textInactive }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: location.pathname.includes('inventory') ? accentColor : 'inherit' }}>
                  <LocalShipping />
                </ListItemIcon>
                <ListItemText primary={t('Logistics')} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                {invOpen ? <ExpandLess sx={{ opacity: 0.5 }} /> : <ExpandMore sx={{ opacity: 0.5 }} />}
              </ListItemButton>

              <Collapse in={invOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <AnimatePresence>
                    {inventoryItems.map((item, i) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <ListItemButton
                          key={item.text}
                          component={motion.div}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => { navigate(item.path); if (mobileOpen) handleDrawerToggle(); }}
                          sx={{
                            pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                            borderRadius: 2, mb: 0.5,
                            color: isActive ? textActive : textInactive,
                            '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 20 }}>
                            <Circle sx={{ fontSize: 6, color: isActive ? accentColor : alpha(textInactive, 0.3) }} />
                          </ListItemIcon>
                          <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                        </ListItemButton>
                      )
                    })}
                  </AnimatePresence>
                </List>
              </Collapse>
            </>
          )}

          {/* HR Section */}
          {hasPermission(PERMISSIONS.VIEW_HR) && (
            <>
              <Box sx={{ my: 3 }} />
              <Typography variant="caption" sx={{ px: 2, mb: 1, display: 'block', fontWeight: 700, fontSize: '0.7rem', opacity: 0.5, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {t('Human Resources')}
              </Typography>

              <ListItemButton
                onClick={() => navigate('/hr')}
                sx={{ borderRadius: 2, mb: 0.5, color: location.pathname === '/hr' ? textActive : textInactive, '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' } }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: location.pathname === '/hr' ? accentColor : 'inherit' }}>
                  <Dashboard />
                </ListItemIcon>
                <ListItemText primary={t('HR Dashboard')} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
              </ListItemButton>

              <ListItemButton
                onClick={() => setEmpOpen(!empOpen)}
                sx={{ borderRadius: 2, mb: 0.5, color: location.pathname.startsWith('/employees') ? textActive : textInactive, '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' } }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: location.pathname.startsWith('/employees') ? accentColor : 'inherit' }}>
                  <People />
                </ListItemIcon>
                <ListItemText primary={t('Employee Management')} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                {empOpen ? <ExpandLess sx={{ opacity: 0.5 }} /> : <ExpandMore sx={{ opacity: 0.5 }} />}
              </ListItemButton>

              <Collapse in={empOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton
                    onClick={() => { navigate('/employees'); if (mobileOpen) handleDrawerToggle(); }}
                    sx={{
                      pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                      borderRadius: 2, mb: 0.5,
                      color: location.pathname === '/employees' ? textActive : textInactive,
                      '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <Circle sx={{ fontSize: 6, color: location.pathname === '/employees' ? accentColor : alpha(textInactive, 0.3) }} />
                    </ListItemIcon>
                    <ListItemText primary={t('All Employees')} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: location.pathname === '/employees' ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                  </ListItemButton>

                  {hasPermission(PERMISSIONS.MANAGE_HR) && (
                    <>
                      <ListItemButton
                        onClick={() => { navigate('/employees/import'); if (mobileOpen) handleDrawerToggle(); }}
                        sx={{
                          pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                          borderRadius: 2, mb: 0.5,
                          color: location.pathname === '/employees/import' ? textActive : textInactive,
                          '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <Circle sx={{ fontSize: 6, color: location.pathname === '/employees/import' ? accentColor : alpha(textInactive, 0.3) }} />
                        </ListItemIcon>
                        <ListItemText primary={t('Import Employees')} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: location.pathname === '/employees/import' ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                      </ListItemButton>

                      <ListItemButton
                        onClick={() => { navigate('/employees/add'); if (mobileOpen) handleDrawerToggle(); }}
                        sx={{
                          pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                          borderRadius: 2, mb: 0.5,
                          color: location.pathname === '/employees/add' ? textActive : textInactive,
                          '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 20 }}>
                          <Circle sx={{ fontSize: 6, color: location.pathname === '/employees/add' ? accentColor : alpha(textInactive, 0.3) }} />
                        </ListItemIcon>
                        <ListItemText primary={t('Add Employee')} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: location.pathname === '/employees/add' ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                      </ListItemButton>
                    </>
                  )}
                </List>
              </Collapse>

              <ListItemButton
                onClick={() => navigate('/hr/attendance')}
                sx={{ borderRadius: 2, mb: 0.5, color: location.pathname === '/hr/attendance' ? textActive : textInactive, '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' } }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: location.pathname === '/hr/attendance' ? accentColor : 'inherit' }}>
                  <AccessTime />
                </ListItemIcon>
                <ListItemText primary={t('Attendance')} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
              </ListItemButton>

              <ListItemButton
                onClick={() => navigate('/hr/shifts')}
                sx={{ borderRadius: 2, mb: 0.5, color: location.pathname === '/hr/shifts' ? textActive : textInactive, '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' } }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: location.pathname === '/hr/shifts' ? accentColor : 'inherit' }}>
                  <Schedule />
                </ListItemIcon>
                <ListItemText primary={t('Shift Settings')} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
              </ListItemButton>

              {hasPermission(PERMISSIONS.MANAGE_HR) && (
                <ListItemButton
                  onClick={() => navigate('/hr/devices')}
                  sx={{ borderRadius: 2, mb: 0.5, color: location.pathname === '/hr/devices' ? textActive : textInactive, '&:hover': { color: theme.palette.mode === 'dark' ? 'text.primary' : '#fff' } }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: location.pathname === '/hr/devices' ? accentColor : 'inherit' }}>
                    <SettingsInputComponent />
                  </ListItemIcon>
                  <ListItemText primary={t('Devices')} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                </ListItemButton>
              )}
            </>
          )}
        </List>
      </Box>

    </Box >
  );

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        anchor="left"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: width, border: 'none', bgcolor: sidebarBg }
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        anchor="left"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: width,
            position: 'fixed',
            top: 0,
            borderRight: isRTL ? 'none' : `1px solid ${theme.palette.divider}`,
            borderLeft: isRTL ? `1px solid ${theme.palette.divider}` : 'none',
            bgcolor: sidebarBg,
          }
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Navigation;