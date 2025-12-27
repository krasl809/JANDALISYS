import React, { useState, useRef } from 'react';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Box, Badge, InputBase, Tooltip, Avatar, Stack, Menu, MenuItem, Typography, Divider, ListItemIcon } from '@mui/material';
import { Menu as MenuIcon, Search as SearchIcon, NotificationsNone, Language, DarkMode, LightMode, Settings, Logout, Person } from '@mui/icons-material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import { useColorMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Styles
const SearchBox = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: '16px',
  backgroundColor: alpha(theme.palette.text.primary, 0.05),
  '&:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.08) },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  transition: 'all 0.2s',
  [theme.breakpoints.up('sm')]: { marginLeft: theme.spacing(3), width: 'auto', minWidth: '320px' },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({ padding: theme.spacing(0, 2), height: '100%', position: 'absolute', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.text.secondary }));
const StyledInputBase = styled(InputBase)(({ theme }) => ({ color: 'inherit', width: '100%', '& .MuiInputBase-input': { padding: theme.spacing(1.5, 1, 1.5, 0), paddingLeft: `calc(1em + ${theme.spacing(4)})`, transition: theme.transitions.create('width'), width: '100%', fontSize: '0.9rem', fontWeight: 500 } }));

const Header: React.FC<{ handleDrawerToggle: () => void }> = ({ handleDrawerToggle }) => {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();
  const { toggleColorMode, mode } = useColorMode();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

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

  const handleMarkAllRead = () => {
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
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: alpha(theme.palette.background.default, 0.8), backdropFilter: 'blur(12px)', borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Toolbar sx={{ minHeight: 70 }}>
        <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { md: 'none' }, color: 'text.primary' }}><MenuIcon /></IconButton>

        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <SearchBox>
            <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
            <StyledInputBase placeholder={t('Search...')} />
          </SearchBox>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.5} alignItems="center">
          
          {/* Theme Toggle Animation */}
          <Tooltip title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}>
            <IconButton
                onClick={toggleColorMode}
                size="small"
                sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', width: 40, height: 40 }}
            >
               <AnimatePresence mode='wait' initial={false}>
                 <motion.div
                    key={mode}
                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                 >
                    {mode === 'dark' ? <LightMode fontSize="small" sx={{ color: '#FDB813' }} /> : <DarkMode fontSize="small" sx={{ color: '#64748B' }} />}
                 </motion.div>
               </AnimatePresence>
           </IconButton>
          </Tooltip>

          <Tooltip title="Language">
            <IconButton onClick={toggleLanguage} size="small" sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', width: 40, height: 40 }}>
                <Language fontSize="small" color="action" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton
              ref={notifButtonRef}
              size="small"
              onClick={handleNotifMenu}
              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', width: 40, height: 40 }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsNone fontSize="small" color="action" />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Notifications Menu */}
          <Menu
            anchorEl={notifAnchorEl}
            open={notifOpen}
            onClose={handleNotifClose}
            disableEnforceFocus
            disableAutoFocus
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 320,
                maxHeight: 400,
                '& .MuiMenuItem-root': {
                  textAlign: isRTL ? 'right' : 'left'
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  [isRTL ? 'left' : 'right']: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {t('Notifications')}
              </Typography>
              {unreadCount > 0 && (
                <Typography 
                  variant="caption" 
                  color="primary" 
                  sx={{ cursor: 'pointer', fontWeight: 600 }}
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
                    whiteSpace: 'normal', 
                    bgcolor: notif.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    py: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={notif.is_read ? 500 : 700}>
                    {notif.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {notif.message}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
                    {new Date(notif.created_at).toLocaleString()}
                  </Typography>
                </MenuItem>
              ))
            )}
          </Menu>

          <Box sx={{ width: 1, height: 24, bgcolor: 'divider', mx: 1 }} />

          <Tooltip title="Account">
            <IconButton
              ref={accountButtonRef}
              sx={{ p: 0 }}
              onClick={handleMenu}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 'bold', boxShadow: theme.shadows[2] }}>
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            onClick={handleClose}
            disableEnforceFocus
            disableAutoFocus
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  [isRTL ? 'left' : 'right']: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {user?.name || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email || ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {user?.role || 'user'}
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={handleSettings}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              {t('Settings')}
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              {t('Logout')}
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;