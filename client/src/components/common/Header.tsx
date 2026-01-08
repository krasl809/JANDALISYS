import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Box, Badge, InputBase, Tooltip, Avatar, Stack, Menu, MenuItem, Typography, Divider, ListItemIcon } from '@mui/material';
import { Menu as MenuIcon, Search as SearchIcon, NotificationsNone, Language, DarkMode, LightMode, Settings, Logout } from '@mui/icons-material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

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

// Styles
const SearchBox = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: '10px',
  backgroundColor: theme.palette.mode === 'light' ? COLORS.bg : '#2A2A2A',
  border: `1px solid ${theme.palette.mode === 'light' ? alpha(COLORS.secondary, 0.1) : theme.palette.divider}`,
  '&:hover': { 
    borderColor: COLORS.primary,
    backgroundColor: theme.palette.mode === 'light' ? COLORS.white : '#333333',
    boxShadow: SHADOWS.xs,
  },
  marginInlineEnd: theme.spacing(2),
  marginInlineStart: 0,
  width: '100%',
  transition: 'all 0.2s ease',
  [theme.breakpoints.up('sm')]: { marginInlineStart: theme.spacing(3), width: 'auto', minWidth: '400px' },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({ 
  paddingInline: theme.spacing(1.5), 
  height: '100%', 
  position: 'absolute', 
  pointerEvents: 'none', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  color: theme.palette.text.secondary 
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({ 
  color: 'inherit', 
  width: '100%', 
  '& .MuiInputBase-input': { 
    padding: theme.spacing(1, 1, 1, 0), 
    paddingInlineStart: `calc(1em + ${theme.spacing(3)})`, 
    transition: theme.transitions.create('width'), 
    width: '100%', 
    fontSize: '0.85rem', 
    fontWeight: 400 
  } 
}));

const Header: React.FC<{ handleDrawerToggle: () => void }> = ({ handleDrawerToggle }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { toggleColorMode, mode } = useColorMode();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const notifOpen = Boolean(notifAnchorEl);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);

  const isRTL = i18n.language.startsWith('ar');

  const toggleLanguage = () => i18n.changeLanguage(i18n.language.startsWith('ar') ? 'en' : 'ar');

  const handleMenu = () => {
    setAnchorEl(accountButtonRef.current);
  };

  const handleNotifMenu = () => {
    setNotifAnchorEl(notifButtonRef.current);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllAsRead();
    handleNotifClose();
  };

  const handleLogout = () => {
    handleClose();
    logout();
    navigate('/login');
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };


  return (
    <AppBar 
      position="sticky" 
      elevation={0} 
      sx={{ 
        bgcolor: mode === 'light' ? COLORS.white : theme.palette.background.paper, 
        borderBottom: `1px solid ${mode === 'light' ? alpha(COLORS.secondary, 0.1) : theme.palette.divider}`,
        boxShadow: mode === 'light' ? SHADOWS.xs : 'none',
        zIndex: theme.zIndex.appBar,
        height: '70px',
        justifyContent: 'center'
      }}
    >
      <Toolbar sx={{ minHeight: '70px !important' }}>
        <IconButton 
          color="inherit" 
          edge="start" 
          onClick={handleDrawerToggle} 
          sx={{ 
            marginInlineEnd: 2, 
            display: { md: 'none' }, 
            color: mode === 'light' ? COLORS.dark : 'text.primary',
            '&:hover': { bgcolor: alpha(COLORS.primary, 0.08) }
          }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <SearchBox>
            <SearchIconWrapper><SearchIcon sx={{ fontSize: 18, color: COLORS.secondary }} /></SearchIconWrapper>
            <StyledInputBase placeholder={t('Search...')} />
          </SearchBox>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          
          {/* Theme Toggle Animation */}
          <Tooltip title={mode === 'dark' ? t('Light Mode') : t('Dark Mode')}>
            <IconButton
                onClick={toggleColorMode}
                size="small"
                sx={{ 
                  borderRadius: '10px', 
                  width: 40, 
                  height: 40,
                  bgcolor: mode === 'light' ? alpha(COLORS.bg, 0.5) : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    bgcolor: alpha(COLORS.primary, 0.1),
                    transform: 'translateY(-1px)',
                    boxShadow: SHADOWS.xs
                  }
                }}
            >
               <AnimatePresence mode='wait' initial={false}>
                 <motion.div
                    key={mode}
                    initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                 >
                    {mode === 'dark' ? <LightMode fontSize="small" sx={{ color: '#FFCB00' }} /> : <DarkMode fontSize="small" sx={{ color: '#676879' }} />}
                 </motion.div>
               </AnimatePresence>
           </IconButton>
          </Tooltip>

          <Tooltip title={t('Language')}>
            <IconButton 
              onClick={toggleLanguage} 
              size="small" 
              sx={{ 
                borderRadius: '10px', 
                width: 48, 
                height: 40,
                bgcolor: mode === 'light' ? alpha(COLORS.bg, 0.5) : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: alpha(COLORS.primary, 0.1),
                  transform: 'translateY(-1px)',
                  boxShadow: SHADOWS.xs
                }
              }}
            >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Language fontSize="small" sx={{ color: COLORS.secondary }} />
                  <Typography variant="caption" fontWeight="800" sx={{ fontSize: '0.7rem', color: COLORS.dark }}>
                    {i18n.language.toUpperCase()}
                  </Typography>
                </Stack>
            </IconButton>
          </Tooltip>

          <Tooltip title={t('Notifications')}>
            <IconButton
              ref={notifButtonRef}
              size="small"
              onClick={handleNotifMenu}
              sx={{ 
                borderRadius: '10px', 
                width: 40, 
                height: 40,
                bgcolor: mode === 'light' ? alpha(COLORS.bg, 0.5) : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: alpha(COLORS.primary, 0.1),
                  transform: 'translateY(-1px)',
                  boxShadow: SHADOWS.xs
                }
              }}
            >
              <Badge 
                badgeContent={unreadCount} 
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    bgcolor: COLORS.error, 
                    color: COLORS.white,
                    fontWeight: 800,
                    boxShadow: SHADOWS.xs
                  } 
                }}
              >
                <NotificationsNone fontSize="small" sx={{ color: COLORS.secondary }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5, borderColor: alpha(COLORS.secondary, 0.2) }} />

          <Tooltip title={user?.name || t('Account')}>
            <IconButton
              ref={accountButtonRef}
              onClick={handleMenu}
              size="small"
              sx={{ 
                p: 0.5,
                borderRadius: '10px',
                transition: 'all 0.2s',
                '&:hover': { bgcolor: alpha(COLORS.primary, 0.08) }
              }}
            >
              <Avatar 
                src={user?.avatar} 
                sx={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '10px',
                  bgcolor: COLORS.primary,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  boxShadow: SHADOWS.sm
                }}
              >
                {user?.name?.[0]}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Account Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: '12px',
              border: `1px solid ${mode === 'light' ? alpha(COLORS.secondary, 0.1) : 'rgba(255, 255, 255, 0.1)'}`,
              boxShadow: SHADOWS.lg,
              bgcolor: mode === 'light' ? COLORS.white : '#1A1A1A',
              '& .MuiMenuItem-root': {
                fontSize: '0.85rem',
                py: 1,
                px: 2,
                mx: 1,
                my: 0.5,
                borderRadius: '8px',
                gap: 1.5,
                color: mode === 'light' ? COLORS.dark : '#E9ECEF',
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: alpha(COLORS.primary, 0.08),
                  color: COLORS.primary,
                  '& .MuiListItemIcon-root': { color: COLORS.primary }
                }
              }
            },
          }}
          transformOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="subtitle2" fontWeight="700" color={mode === 'light' ? COLORS.dark : COLORS.white} sx={{ fontSize: '0.9rem' }}>
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" color={COLORS.secondary} sx={{ fontWeight: 500 }}>
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.5, opacity: 0.6 }} />
          <MenuItem onClick={handleSettings}>
            <ListItemIcon sx={{ minWidth: 'auto !important', color: COLORS.secondary }}><Settings sx={{ fontSize: 18 }} /></ListItemIcon>
            <Typography variant="inherit" fontWeight="600">{t('Settings')}</Typography>
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ '&:hover': { bgcolor: alpha(COLORS.error, 0.08), color: `${COLORS.error} !important`, '& .MuiListItemIcon-root': { color: `${COLORS.error} !important` } } }}>
            <ListItemIcon sx={{ minWidth: 'auto !important', color: COLORS.secondary }}><Logout sx={{ fontSize: 18 }} /></ListItemIcon>
            <Typography variant="inherit" fontWeight="600">{t('Logout')}</Typography>
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notifAnchorEl}
          open={notifOpen}
          onClose={handleNotifClose}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              width: 320,
              maxHeight: 450,
              borderRadius: '16px',
              border: `1px solid ${mode === 'light' ? alpha(COLORS.secondary, 0.1) : 'rgba(255, 255, 255, 0.1)'}`,
              boxShadow: SHADOWS.lg,
              bgcolor: mode === 'light' ? COLORS.white : '#1A1A1A',
              overflow: 'hidden',
              '& .MuiMenuItem-root': {
                fontSize: '0.85rem',
                whiteSpace: 'normal',
                py: 2,
                px: 2.5,
                borderBottom: `1px solid ${mode === 'light' ? alpha(COLORS.secondary, 0.05) : 'rgba(255, 255, 255, 0.05)'}`,
                transition: 'all 0.2s',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: alpha(COLORS.primary, 0.04) }
              },
            },
          }}
          transformOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: mode === 'light' ? alpha(COLORS.bg, 0.5) : alpha(COLORS.white, 0.02) }}>
            <Typography variant="subtitle2" fontWeight="800" color={mode === 'light' ? COLORS.dark : COLORS.white}>
              {t('Notifications')}
            </Typography>
            {unreadCount > 0 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  cursor: 'pointer', 
                  fontWeight: 800, 
                  color: COLORS.primary,
                  textTransform: 'uppercase',
                  fontSize: '0.7rem',
                  letterSpacing: '0.5px',
                  '&:hover': { color: COLORS.info } 
                }}
                onClick={handleMarkAllRead}
              >
                {t('Mark all as read')}
              </Typography>
            )}
          </Box>
          <Divider sx={{ m: 0, opacity: 0.6 }} />
          <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <NotificationsNone sx={{ fontSize: 40, color: alpha(COLORS.secondary, 0.3), mb: 1 }} />
                <Typography variant="body2" color={COLORS.secondary} fontWeight="500">
                  {t('No notifications yet')}
                </Typography>
              </Box>
            ) : (
              notifications.map((notif) => (
                <MenuItem 
                  key={notif.id} 
                  onClick={() => handleMarkAsRead(notif.id)}
                  sx={{ 
                    bgcolor: notif.is_read ? 'transparent' : alpha(COLORS.primary, 0.03),
                    position: 'relative',
                    '&::before': !notif.is_read ? {
                      content: '""',
                      position: 'absolute',
                      left: isRTL ? 'auto' : 0,
                      right: isRTL ? 0 : 'auto',
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      bgcolor: COLORS.primary,
                      borderRadius: isRTL ? '0 4px 4px 0' : '4px 0 0 4px'
                    } : {}
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                      <Typography variant="body2" fontWeight={notif.is_read ? 600 : 800} color={mode === 'light' ? COLORS.dark : COLORS.white}>
                        {notif.title}
                      </Typography>
                      {!notif.is_read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS.primary, mt: 0.5 }} />}
                    </Stack>
                    <Typography variant="caption" color={COLORS.secondary} sx={{ display: 'block', lineHeight: 1.4, fontWeight: 500 }}>
                      {notif.message}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Box>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;