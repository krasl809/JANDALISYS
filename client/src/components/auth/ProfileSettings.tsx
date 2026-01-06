import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Paper,
  Stack,
  Avatar
} from '@mui/material';
import { Lock, Save } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ProfileSettings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth(); // We might need to refresh user data in context

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('users/profile', profileData);
      setSuccess(t('Profile updated successfully'));
      // Ideally update auth context here if needed
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError(t('Passwords do not match'));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('users/change-password', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      setSuccess(t('Password changed successfully'));
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Grid container spacing={4}>
        {/* Profile Info */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                {user?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {t('Profile Information')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Update your personal details')}
                </Typography>
              </Box>
            </Stack>

            <form onSubmit={handleUpdateProfile}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label={t('Name')}
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  required
                />
                <TextField
                  fullWidth
                  label={t('Email')}
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  disabled // Email usually fixed
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save />}
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {t('Save Changes')}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid>

        {/* Change Password */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Box sx={{ p: 1, bgcolor: 'error.light', borderRadius: 2, color: 'error.main' }}>
                <Lock />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {t('Security')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Update your password')}
                </Typography>
              </Box>
            </Stack>

            <form onSubmit={handleChangePassword}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  type="password"
                  label={t('Old Password')}
                  name="old_password"
                  value={passwordData.old_password}
                  onChange={handlePasswordChange}
                  required
                />
                <TextField
                  fullWidth
                  type="password"
                  label={t('New Password')}
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                />
                <TextField
                  fullWidth
                  type="password"
                  label={t('Confirm New Password')}
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                />
                <Button
                  type="submit"
                  variant="outlined"
                  color="primary"
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {t('Update Password')}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Grid>

        {/* Status Messages */}
        <Grid item xs={12}>
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfileSettings;
