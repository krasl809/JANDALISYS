import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    console.log('Login attempt started...');
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Sending request to /auth/login with:', { email });
      const response = await api.post('auth/login', {
        email,
        password
      }, {
        timeout: 15000 // 15 seconds timeout for login
      });
      console.log('Response received from /auth/login:', response.status);

      const { access_token, user_id, role, permissions } = response.data;
      console.log('Data extracted from response:', { user_id, role });

      // حفظ البيانات في localStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('user_role', role);

      if (permissions) {
        localStorage.setItem('user_permissions', JSON.stringify(permissions));
      }

      console.log('Data saved to localStorage. Refreshing user context...');
      // تحديث AuthContext
      refreshUser();

      // الحصول على معلومات المستخدم الكاملة من الخادم
      try {
        console.log('Fetching user info from /auth/me...');
        const userResponse = await api.get('auth/me');
        console.log('User info response received:', userResponse.status);
        const userData = userResponse.data;

        // حفظ معلومات المستخدم الإضافية
        localStorage.setItem('user_name', userData.name || 'User');
        localStorage.setItem('user_email', userData.email || email);

        console.log('User info saved. Refreshing user context again...');
        // تحديث AuthContext مرة أخرى مع معلومات المستخدم
        refreshUser();
      } catch (userError: any) {
        console.warn('Could not fetch user info, using defaults:', userError.message);
        // استخدام البيانات المتاحة
        localStorage.setItem('user_name', 'Admin User');
        localStorage.setItem('user_email', email);
        refreshUser();
      }

      console.log('Login process complete. Determining redirection path...');
      
      // توجيه مستخدمي الأرشيف إلى لوحة تحكم الأرشيف مباشرة
      if (role === 'archive_admin' || role === 'archive_viewer' || (permissions && permissions.includes('archive_read') && !permissions.includes('view_dashboard'))) {
        console.log('Archive user detected. Navigating to archive dashboard...');
        navigate('/archive/dashboard');
      } else {
        console.log('Standard user detected. Navigating to home...');
        navigate('/');
      }
    } catch (err: any) {
      console.error('Login error caught:', err);
      
      let errorDetail = 'Login failed';
      
      if (err.code === 'ECONNABORTED' || err.message === 'Network Error') {
        errorDetail = 'الخادم غير متصل. يرجى التأكد من تشغيل الباك اند.';
      } else if (err.response) {
        console.error('Error response data:', err.response.data);
        console.error('Error response status:', err.response.status);
        errorDetail = err.response.data?.detail || err.response.data?.message || 'فشل تسجيل الدخول. يرجى التحقق من البيانات.';
      } else if (err.request) {
        console.error('No response received from server. Request details:', err.request);
        errorDetail = 'لم يتم استلام رد من الخادم. يرجى المحاولة مرة أخرى.';
      } else {
        console.error('Error message:', err.message);
        errorDetail = err.message;
      }
      
      setError(errorDetail);
    } finally {
      console.log('Login finally block reached. Setting loading to false.');
      setLoading(false);
    }
  };


  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            {t('login') || 'تسجيل الدخول'}
          </Typography>

          <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 2 }}>
            {t('loginSubtitle') || 'قم بتسجيل الدخول للوصول إلى النظام'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('email') || 'البريد الإلكتروني'}
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('password') || 'كلمة المرور'}
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : (t('login') || 'تسجيل الدخول')}
            </Button>

          </Box>


        </Paper>
      </Box>
    </Container>
  );
};

export default Login;