import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Collapse, Divider, useTheme
} from '@mui/material';
import {
  Dashboard, Description, PriceCheck, Payment,
  LocalShipping, ExpandLess, ExpandMore, Assessment,
  AccessTime, SettingsInputComponent, People, Schedule,
  FolderSpecial
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../config/permissions';

interface NavProps {
  width: number;
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const menuItems = [
  { text: 'dashboard.title', path: '/', icon: <Dashboard />, permission: PERMISSIONS.VIEW_DASHBOARD },
  { text: 'contracts', path: '/contracts', icon: <Description />, permission: PERMISSIONS.VIEW_CONTRACTS },
  { text: 'pricing', path: '/pricing', icon: <PriceCheck />, permission: PERMISSIONS.VIEW_PRICING },
  { text: 'payments', path: '/payments', icon: <Payment />, permission: PERMISSIONS.VIEW_PAYMENTS },
  { text: 'Archive Dashboard', path: '/archive/dashboard', icon: <Dashboard />, permission: PERMISSIONS.VIEW_ARCHIVE },
  { text: 'Electronic Archive', path: '/archive', icon: <FolderSpecial />, permission: PERMISSIONS.VIEW_ARCHIVE },
  { text: 'Reports & Analytics', path: '/reports', icon: <Assessment />, permission: PERMISSIONS.VIEW_REPORTS },
];

const inventoryItems = [
  { text: 'Warehouses', path: '/inventory/warehouses' },
  { text: 'Stock Levels', path: '/inventory/stock' },
  { text: 'Movements', path: '/inventory/movements' },
];

// Material Dashboard 2 Pro Style Constants
const COLORS = {
  primary: '#5E72E4',
  secondary: '#8392AB',
  info: '#11CDEF',
  success: '#2DCE89',
  warning: '#FB6340',
  error: '#F5365C',
  dark: '#344767',
  light: '#E9ECEF',
  bg: '#F8F9FA',
  white: '#FFFFFF',
  gradientPrimary: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
};

const SHADOWS = {
  xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
  sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
  md: '0 7px 14px rgba(50, 50, 93, 0.1)',
  lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
};

const Navigation: React.FC<NavProps> = ({ width, mobileOpen, handleDrawerToggle }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { hasPermission } = useAuth();

  const isRTL = i18n.language === 'ar';
  const [invOpen, setInvOpen] = React.useState(true);
  const [empOpen, setEmpOpen] = React.useState(true);

  // Dynamic Theme Colors
  const isDark = theme.palette.mode === 'dark';
  const sidebarBg = isDark ? '#1a2035' : COLORS.white;
  const textActive = COLORS.white;
  const textInactive = isDark ? 'rgba(255, 255, 255, 0.7)' : COLORS.secondary;
  const accentColor = COLORS.primary;
  const dividerColor = isDark ? 'rgba(255, 255, 255, 0.12)' : COLORS.light;
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.05)' : COLORS.bg;

  const { boxShadows }: any = theme;

  const drawerPaperStyles = React.useMemo(() => ({
    boxSizing: 'border-box' as const,
    width: width,
    border: 'none',
    bgcolor: sidebarBg,
    boxShadow: boxShadows.md,
  }), [width, sidebarBg, boxShadows]);

  // Filter items based on permissions
  const filteredMenuItems = React.useMemo(() => 
    menuItems.filter(item => hasPermission(item.permission)).map(item => ({
        ...item,
        text: t(item.text)
    })),
    [hasPermission, t]
  );

  const memoizedInventoryItems = React.useMemo(() => 
    inventoryItems.map(item => ({
        ...item,
        text: t(item.text)
    })),
    [t]
  );

  const showInventory = React.useMemo(() => hasPermission(PERMISSIONS.VIEW_INVENTORY), [hasPermission]);
  const showHR = React.useMemo(() => hasPermission(PERMISSIONS.VIEW_HR), [hasPermission]);
  const canManageHR = React.useMemo(() => hasPermission(PERMISSIONS.MANAGE_HR), [hasPermission]);

  const drawerContent = React.useMemo(() => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: sidebarBg, color: textInactive }}>

      {/* Brand */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{
          width: 36, height: 36, bgcolor: accentColor, borderRadius: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: '800', fontSize: '1.2rem',
          boxShadow: `0 4px 12px ${alpha(accentColor, 0.4)}`
        }}>
          J
        </Box>
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, letterSpacing: '0.05em', fontSize: '1.1rem' }}>
            {t('JANDALISYS')}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: dividerColor, mb: 1, mx: 2 }} />

      {/* Menu Items */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.5 }}>
        <List>
          <Typography variant="caption" sx={{ px: 2, mb: 1, mt: 2, display: 'block', fontWeight: 600, fontSize: '0.75rem', color: textInactive, opacity: 0.8 }}>
            {t('Main Menu')}
          </Typography>

          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5, px: 1.5 }}>
                <ListItemButton
                  onClick={() => { navigate(item.path); if (mobileOpen) handleDrawerToggle(); }}
                  sx={{
                    borderRadius: '8px',
                    py: 1.2,
                    px: 2,
                    color: isActive ? textActive : textInactive,
                    background: isActive ? COLORS.gradientPrimary : 'transparent',
                    boxShadow: isActive ? SHADOWS.sm : 'none',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { 
                      bgcolor: isActive ? accentColor : hoverBg,
                      color: isActive ? textActive : (isDark ? '#fff' : COLORS.dark),
                      transform: 'translateX(4px)'
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: isActive ? textActive : 'inherit' }}>
                    {React.cloneElement(item.icon as React.ReactElement, { sx: { fontSize: 18 } })}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 400 }}
                    sx={{ textAlign: isRTL ? 'right' : 'left' }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

          <Box sx={{ my: 3 }} />

          {showInventory && (
            <>
              <Typography variant="caption" sx={{ px: 2, mb: 1, mt: 3, display: 'block', fontWeight: 600, fontSize: '0.75rem', color: textInactive, opacity: 0.8 }}>
                {t('Operations')}
              </Typography>

              <ListItemButton
                onClick={() => setInvOpen(!invOpen)}
                sx={{ 
                  borderRadius: 1, 
                  mb: 0.2, 
                  px: 2,
                  color: location.pathname.includes('inventory') ? textActive : textInactive,
                  '&:hover': { bgcolor: hoverBg, color: isDark ? '#fff' : '#323338' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: location.pathname.includes('inventory') ? accentColor : 'inherit' }}>
                  <LocalShipping sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary={t('Logistics')} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                {invOpen ? <ExpandLess sx={{ opacity: 0.5, fontSize: 18 }} /> : <ExpandMore sx={{ opacity: 0.5, fontSize: 18 }} />}
              </ListItemButton>

              <Collapse in={invOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {memoizedInventoryItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <ListItemButton
                        key={item.text}
                        onClick={() => { navigate(item.path); if (mobileOpen) handleDrawerToggle(); }}
                        sx={{
                          pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                          borderRadius: 1, mb: 0.2,
                          color: isActive ? textActive : textInactive,
                          bgcolor: isActive ? (isDark ? 'rgba(0, 115, 234, 0.15)' : 'rgba(0, 115, 234, 0.1)') : 'transparent',
                          '&:hover': { bgcolor: isActive ? (isDark ? 'rgba(0, 115, 234, 0.2)' : 'rgba(0, 115, 234, 0.15)') : hoverBg }
                        }}
                      >
                        <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: isActive ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                      </ListItemButton>
                    )
                  })}
                </List>
              </Collapse>
            </>
          )}

          {/* HR Section */}
          {showHR && (
            <>
              <Typography variant="caption" sx={{ px: 2, mb: 1, mt: 3, display: 'block', fontWeight: 600, fontSize: '0.75rem', color: textInactive, opacity: 0.8 }}>
                {t('Human Resources')}
              </Typography>

              <ListItemButton
                onClick={() => navigate('/hr')}
                sx={{ 
                  borderRadius: '8px', 
                  mb: 0.5, 
                  mx: 1.5,
                  px: 2,
                  py: 1.2,
                  color: location.pathname === '/hr' ? textActive : textInactive,
                  background: location.pathname === '/hr' ? COLORS.gradientPrimary : 'transparent',
                  boxShadow: location.pathname === '/hr' ? SHADOWS.sm : 'none',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    bgcolor: location.pathname === '/hr' ? accentColor : hoverBg,
                    color: location.pathname === '/hr' ? textActive : (isDark ? '#fff' : COLORS.dark),
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: location.pathname === '/hr' ? textActive : 'inherit' }}>
                  <Dashboard sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary={t('HR Dashboard')} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: location.pathname === '/hr' ? 700 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
              </ListItemButton>

              <ListItemButton
                onClick={() => setEmpOpen(!empOpen)}
                sx={{ 
                  borderRadius: '8px', 
                  mb: 0.5, 
                  mx: 1.5,
                  px: 2,
                  py: 1.2,
                  color: location.pathname.startsWith('/employees') ? textActive : textInactive,
                  background: location.pathname.startsWith('/employees') ? COLORS.gradientPrimary : 'transparent',
                  boxShadow: location.pathname.startsWith('/employees') ? SHADOWS.sm : 'none',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    bgcolor: location.pathname.startsWith('/employees') ? accentColor : hoverBg,
                    color: location.pathname.startsWith('/employees') ? textActive : (isDark ? '#fff' : COLORS.dark),
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: location.pathname.startsWith('/employees') ? textActive : 'inherit' }}>
                  <People sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary={t('Human Resources')} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: location.pathname.startsWith('/employees') ? 700 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                {empOpen ? <ExpandLess sx={{ opacity: 0.8, fontSize: 18, color: location.pathname.startsWith('/employees') ? textActive : 'inherit' }} /> : <ExpandMore sx={{ opacity: 0.8, fontSize: 18, color: location.pathname.startsWith('/employees') ? textActive : 'inherit' }} />}
              </ListItemButton>

              <Collapse in={empOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ mx: 1.5 }}>
                  <ListItemButton
                    onClick={() => { navigate('/employees'); if (mobileOpen) handleDrawerToggle(); }}
                    sx={{
                      pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                      borderRadius: '8px', mb: 0.2,
                      color: location.pathname === '/employees' ? textActive : textInactive,
                      background: location.pathname === '/employees' ? alpha(COLORS.primary, 0.1) : 'transparent',
                      '&:hover': { bgcolor: alpha(COLORS.primary, 0.15) }
                    }}
                  >
                    <ListItemText primary={t('All Employees')} primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: location.pathname === '/employees' ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                  </ListItemButton>
  
                  {canManageHR && (
                    <>
                      <ListItemButton
                        onClick={() => { navigate('/employees/import'); if (mobileOpen) handleDrawerToggle(); }}
                        sx={{
                          pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                          borderRadius: '8px', mb: 0.2,
                          color: location.pathname === '/employees/import' ? textActive : textInactive,
                          background: location.pathname === '/employees/import' ? alpha(COLORS.primary, 0.1) : 'transparent',
                          '&:hover': { bgcolor: alpha(COLORS.primary, 0.15) }
                        }}
                      >
                        <ListItemText primary={t('Import Employees')} primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: location.pathname === '/employees/import' ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                      </ListItemButton>

                      <ListItemButton
                        onClick={() => { navigate('/employees/add'); if (mobileOpen) handleDrawerToggle(); }}
                        sx={{
                          pl: isRTL ? 2 : 6.5, pr: isRTL ? 6.5 : 2,
                          borderRadius: '8px', mb: 0.2,
                          color: location.pathname === '/employees/add' ? textActive : textInactive,
                          background: location.pathname === '/employees/add' ? alpha(COLORS.primary, 0.1) : 'transparent',
                          '&:hover': { bgcolor: alpha(COLORS.primary, 0.15) }
                        }}
                      >
                        <ListItemText primary={t('Add Employee')} primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: location.pathname === '/employees/add' ? 600 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                      </ListItemButton>
                    </>
                  )}
                </List>
              </Collapse>

              <ListItemButton
                onClick={() => navigate('/hr/attendance')}
                sx={{ 
                  borderRadius: '8px', 
                  mb: 0.5, 
                  mx: 1.5,
                  px: 2,
                  py: 1.2,
                  color: location.pathname === '/hr/attendance' ? textActive : textInactive,
                  background: location.pathname === '/hr/attendance' ? COLORS.gradientPrimary : 'transparent',
                  boxShadow: location.pathname === '/hr/attendance' ? SHADOWS.sm : 'none',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    bgcolor: location.pathname === '/hr/attendance' ? accentColor : hoverBg,
                    color: location.pathname === '/hr/attendance' ? textActive : (isDark ? '#fff' : COLORS.dark),
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: location.pathname === '/hr/attendance' ? textActive : 'inherit' }}>
                  <AccessTime sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary={t('Attendance')} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: location.pathname === '/hr/attendance' ? 700 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
              </ListItemButton>

              <ListItemButton
                onClick={() => navigate('/hr/shifts')}
                sx={{ 
                  borderRadius: '8px', 
                  mb: 0.5, 
                  mx: 1.5,
                  px: 2,
                  py: 1.2,
                  color: location.pathname === '/hr/shifts' ? textActive : textInactive,
                  background: location.pathname === '/hr/shifts' ? COLORS.gradientPrimary : 'transparent',
                  boxShadow: location.pathname === '/hr/shifts' ? SHADOWS.sm : 'none',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': { 
                    bgcolor: location.pathname === '/hr/shifts' ? accentColor : hoverBg,
                    color: location.pathname === '/hr/shifts' ? textActive : (isDark ? '#fff' : COLORS.dark),
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: location.pathname === '/hr/shifts' ? textActive : 'inherit' }}>
                  <Schedule sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary={t('Shift Settings')} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: location.pathname === '/hr/shifts' ? 700 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
              </ListItemButton>
  
              {canManageHR && (
                <ListItemButton
                  onClick={() => navigate('/hr/devices')}
                  sx={{ 
                    borderRadius: '8px', 
                    mb: 0.5, 
                    mx: 1.5,
                    px: 2,
                    py: 1.2,
                    color: location.pathname === '/hr/devices' ? textActive : textInactive,
                    background: location.pathname === '/hr/devices' ? COLORS.gradientPrimary : 'transparent',
                    boxShadow: location.pathname === '/hr/devices' ? SHADOWS.sm : 'none',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': { 
                      bgcolor: location.pathname === '/hr/devices' ? accentColor : hoverBg,
                      color: location.pathname === '/hr/devices' ? textActive : (isDark ? '#fff' : COLORS.dark),
                      transform: 'translateX(4px)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: location.pathname === '/hr/devices' ? textActive : 'inherit' }}>
                    <SettingsInputComponent sx={{ fontSize: 18 }} />
                  </ListItemIcon>
                  <ListItemText primary={t('Devices')} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: location.pathname === '/hr/devices' ? 700 : 400 }} sx={{ textAlign: isRTL ? 'right' : 'left' }} />
                </ListItemButton>
              )}
            </>
          )}
        </List>
      </Box>

    </Box >
  ), [sidebarBg, textInactive, accentColor, isDark, t, dividerColor, filteredMenuItems, location.pathname, navigate, mobileOpen, handleDrawerToggle, hoverBg, textActive, isRTL, showInventory, invOpen, memoizedInventoryItems, showHR, empOpen, canManageHR]);

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        anchor={isRTL ? 'right' : 'left'}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': drawerPaperStyles
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        anchor={isRTL ? 'right' : 'left'}
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            ...drawerPaperStyles,
            position: 'fixed',
            top: 0,
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
