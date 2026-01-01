// src/components/inventory/InventoryDashboard.tsx

import React from 'react';
import {
  Container, Grid, Paper, Typography, Box, Card, CardContent,
  LinearProgress, Avatar, Stack, Divider, Button, useTheme
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Inventory, Warning, TrendingUp, AssignmentLate,
  ArrowForward, Warehouse, LocalShipping
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const InventoryDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  const StatCard = ({ title, value, icon, color, subtext }: any) => (
    <Card elevation={0} sx={{
      border: `1px solid ${theme.palette.divider}`,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 3,
      boxShadow: theme.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
      transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
      '&:hover': {
        boxShadow: theme.palette.mode === 'light' ? '0 4px 6px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.3)',
        transform: 'translateY(-2px)',
      },
    }}>
      <Box sx={{ position: 'absolute', right: theme.direction === 'rtl' ? 'auto' : -10, left: theme.direction === 'rtl' ? -10 : 'auto', top: -10, opacity: 0.1, transform: theme.direction === 'rtl' ? 'rotate(-15deg)' : 'rotate(15deg)' }}>
          {React.cloneElement(icon, { sx: { fontSize: 100, color: color } })}
      </Box>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="textSecondary" fontWeight="600" gutterBottom>
              {t(title).toUpperCase()}
            </Typography>
            <Typography variant="h4" fontWeight="800" sx={{ color: theme.palette.primary.main, mb: 1 }}>
              {value}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ bgcolor: alpha(color, 0.1), color: color, px: 1, py: 0.5, borderRadius: 1, fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {t(subtext)}
              </Box>
            </Stack>
          </Box>
          <Avatar variant="rounded" sx={{ bgcolor: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
            <Typography variant="h4" fontWeight="800" color="primary">{t('Inventory Overview')}</Typography>
            <Typography variant="body1" color="textSecondary">{t('Real-time stock levels & logistics insights')}</Typography>
        </Box>
        <Button variant="contained" startIcon={<LocalShipping />} onClick={() => navigate('/inventory/movements/new')}>
            {t('New Movement')}
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Total Inventory Value" 
            value="$1.25M" 
            icon={<TrendingUp />} 
            color="#10B981" 
            subtext="+12% vs last month" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Active Warehouses" 
            value="4" 
            icon={<Warehouse />} 
            color="#3B82F6" 
            subtext="85% Capacity Utilization" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Pending Approvals" 
            value="8" 
            icon={<AssignmentLate />} 
            color="#F59E0B" 
            subtext="Needs immediate attention" 
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard 
            title="Low Stock Alerts" 
            value="3" 
            icon={<Warning />} 
            color="#EF4444" 
            subtext="Items below reorder point" 
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Warehouse Capacity */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{
            p: 3,
            border: `1px solid ${theme.palette.divider}`,
            height: '100%',
            borderRadius: 3,
            boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'box-shadow 0.2s ease-in-out',
            '&:hover': {
              boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.4)',
            }
          }} aria-label={t('Warehouse Capacity Status')}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">{t('Warehouse Capacity Status')}</Typography>
                <Button 
                  size="small" 
                  endIcon={<ArrowForward sx={{ transform: theme.direction === 'rtl' ? 'rotate(180deg)' : 'none' }} />} 
                  onClick={() => navigate('/inventory/warehouses')}
                >
                  {t('View Details')}
                </Button>
            </Box>
            
            <Stack spacing={4}>
                {[
                    { name: 'Main Warehouse (Damascus)', val: 85, color: 'error' },
                    { name: 'Aleppo Branch', val: 45, color: 'success' },
                    { name: 'Lattakia Port Store', val: 62, color: 'warning' },
                    { name: 'Homs Distribution', val: 20, color: 'success' }
                ].map((w) => (
                <Box key={w.name}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight="600">{t(w.name)}</Typography>
                        <Typography variant="body2" fontWeight="bold">{w.val}%</Typography>
                    </Box>
                    <LinearProgress 
                        variant="determinate" 
                        value={w.val} 
                        color={w.color as any}
                        sx={{ height: 10, borderRadius: 5, bgcolor: '#F1F5F9' }} 
                    />
                </Box>
                ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Recent Activity / Alerts */}
        <Grid item xs={12} md={4}>
           <Paper elevation={0} sx={{
             p: 0,
             border: `1px solid ${theme.palette.divider}`,
             height: '100%',
             overflow: 'hidden',
             borderRadius: 3,
             boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
             transition: 'box-shadow 0.2s ease-in-out',
             '&:hover': {
               boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.4)',
             }
           }} aria-label={t('Critical Alerts')}>
              <Box p={3} borderBottom="1px solid #e0e0e0">
                  <Typography variant="h6" fontWeight="bold">{t('Critical Alerts')}</Typography>
              </Box>
              <Stack divider={<Divider />}>
                  {[
                      { msg: 'White Sugar below min level (50 MT)', time: t('{{count}} hours ago', { count: 2 }), type: 'low' },
                      { msg: 'Inbound Shipment #DN-2024-88 Pending Approval', time: t('{{count}} hours ago', { count: 5 }), type: 'pending' },
                      { msg: 'Aleppo Warehouse capacity reached 90%', time: t('1 day ago'), type: 'cap' }
                  ].map((item, index) => (
                      <Box key={index} p={2} display="flex" gap={2}>
                          <Box
                            sx={{
                              width: 8, height: 8, borderRadius: '50%', mt: 1, flexShrink: 0,
                              bgcolor: item.type === 'low' ? theme.palette.error.main : (item.type === 'pending' ? theme.palette.warning.main : theme.palette.info.main)
                            }}
                          />
                          <Box>
                              <Typography variant="body2" fontWeight="500">{t(item.msg)}</Typography>
                              <Typography variant="caption" color="textSecondary">{item.time}</Typography>
                          </Box>
                      </Box>
                  ))}
              </Stack>
              <Box p={2} textAlign="center">
                <Button fullWidth variant="outlined" aria-label={t('View All Notifications')}>{t('View All Notifications')}</Button>
              </Box>
           </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default InventoryDashboard;