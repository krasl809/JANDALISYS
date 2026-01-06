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

// Styles
const SearchBox = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: '8px',
  backgroundColor: theme.palette.mode === 'light' ? '#F5F6F8' : '#2A2A2A',
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': { 
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.mode === 'light' ? '#FFFFFF' : '#333333',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
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
  const isRTL = i18n.language === 'ar';

  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const notifButtonRef = useRef<HTMLButtonElement>(null);

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en');

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
        bgcolor: theme.palette.background.paper, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.appBar
      }}
    >
      <Toolbar sx={{ minHeight: 64 }}>
        <IconButton 
          color="inherit" 
          edge="start" 
          onClick={handleDrawerToggle} 
          sx={{ marginInlineEnd: 2, display: { md: 'none' }, color: 'text.primary' }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <SearchBox>
            <SearchIconWrapper><SearchIcon sx={{ fontSize: 18 }} /></SearchIconWrapper>
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
                  borderRadius: '8px', 
                  width: 40, 
                  height: 40,
                  transition: 'all 0.2s',
                  '&:hover': { 
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    transform: 'translateY(-1px)'
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
                borderRadius: '8px', 
                width: 40, 
                height: 40,
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateY(-1px)'
                }
              }}
            >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Language fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="caption" fontWeight="700" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
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
                borderRadius: '8px', 
                width: 40, 
                height: 40,
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <Badge 
                badgeContent={unreadCount} 
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    fontSize: '0.65rem', 
                    height: 18, 
                    minWidth: 18,
                    border: `2px solid ${theme.palette.background.paper}`
                  } 
                }}
              >
                <NotificationsNone fontSize="small" sx={{ color: 'text.secondary' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5 }} />

          {/* User Profile */}
          <Tooltip title={user?.name || t('Account')}>
            <IconButton
              ref={accountButtonRef}
              onClick={handleMenu}
              sx={{ 
                p: 0.5, 
                borderRadius: '4px',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
              }}
            >
              <Avatar 
                src={user?.avatar} 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  fontSize: '0.875rem',
                  bgcolor: theme.palette.primary.main,
                  fontWeight: 600
                }}
              >
                {user?.name?.charAt(0) || 'U'}
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
            elevation: 2,
            sx: {
              mt: 1.5,
              minWidth: 200,
              borderRadius: '8px',
              border: `1px solid ${theme.palette.divider}`,
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                py: 1,
                px: 2,
                gap: 1.5,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
              }
            },
          }}
          transformOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight="700" color="text.primary">
              {user?.name || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleSettings}>
            <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
            {t('Settings')}
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            {t('Logout')}
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notifAnchorEl}
          open={notifOpen}
          onClose={handleNotifClose}
          PaperProps={{
            elevation: 2,
            sx: {
              mt: 1.5,
              width: 320,
              maxHeight: 400,
              borderRadius: '8px',
              border: `1px solid ${theme.palette.divider}`,
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                whiteSpace: 'normal',
                py: 1.5,
                borderBottom: `1px solid ${theme.palette.divider}`,
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
              },
            },
          }}
          transformOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: isRTL ? 'left' : 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight="700">
              {t('Notifications')}
            </Typography>
            {unreadCount > 0 && (
              <Typography 
                variant="caption" 
                color="primary" 
                sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
                onClick={handleMarkAllRead}
              >
                {t('Mark all as read')}
              </Typography>
            )}
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('No notifications')}
              </Typography>
            </Box>
          ) : (
            notifications.map((notif) => (
              <MenuItem 
                key={notif.id} 
                onClick={() => handleMarkAsRead(notif.id)}
                sx={{ 
                  bgcolor: notif.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.03),
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={notif.is_read ? 500 : 700} color="text.primary">
                    {notif.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {notif.message}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;