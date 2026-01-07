import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Grid, Typography, Paper, useTheme, alpha, Skeleton, Stack, Button } from '@mui/material';
import { People, Warning, CheckCircle, Cancel, TrendingUp, Refresh } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

interface HrStats {
    total_employees: number;
    present_today: number;
    late_today: number;
    absent_today: number;
    early_leave_today: number;
    currently_in: number;
}

const HrDashboard: React.FC = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const [stats, setStats] = useState<HrStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('hr/dashboard');
            setStats(res.data);
        } catch (error: any) {
            console.error("❌ Failed to load HR stats", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

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
        gradientSuccess: 'linear-gradient(135deg, #2DCE89 0%, #2DCE89 100%)',
        gradientInfo: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)',
        gradientWarning: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)',
        gradientError: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
    };

    const SHADOWS = {
        xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
        sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
        md: '0 7px 14px rgba(50, 50, 93, 0.1)',
        lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
    };

    const cards = useMemo(() => [
        {
            title: t("Total Employees"),
            value: stats?.total_employees || 0,
            icon: <People />,
            gradient: COLORS.gradientPrimary,
        },
        {
            title: t("Currently In"),
            value: stats?.currently_in || 0,
            icon: <CheckCircle />,
            gradient: COLORS.gradientSuccess,
        },
        {
            title: t("Late Arrivals"),
            value: stats?.late_today || 0,
            icon: <Warning />,
            gradient: COLORS.gradientWarning,
        },
        {
            title: t("Early Leave"),
            value: stats?.early_leave_today || 0,
            icon: <TrendingUp />,
            gradient: COLORS.gradientInfo,
        },
        {
            title: t("Absent"),
            value: stats?.absent_today || 0,
            icon: <Cancel />,
            gradient: COLORS.gradientError,
        }
    ], [stats, t]);

    return (
        <Box sx={{ p: { xs: 3, md: 4 }, bgcolor: COLORS.bg, minHeight: '100vh' }}>
            <Box mb={5} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h3" fontWeight="800" sx={{ mb: 1, color: COLORS.dark, letterSpacing: '-1px' }}>
                        {t("HR Overview")}
                    </Typography>
                    <Typography variant="body1" color={COLORS.secondary} fontWeight="500">
                        {t("Real-time workforce monitoring and attendance analytics")}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button 
                        variant="contained" 
                        startIcon={<Refresh />} 
                        onClick={fetchStats}
                        disabled={loading}
                        sx={{ 
                            borderRadius: '8px', 
                            background: COLORS.gradientPrimary,
                            boxShadow: SHADOWS.sm,
                            textTransform: 'none',
                            px: 3,
                            py: 1,
                            fontWeight: '700',
                            '&:hover': {
                                boxShadow: SHADOWS.md,
                                opacity: 0.9
                            }
                        }}
                    >
                        {t("Refresh Data")}
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3} mb={6}>
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={2.4} key={`skeleton-${i}`}>
                            <Paper sx={{ p: 3, borderRadius: '16px', boxShadow: SHADOWS.sm }}>
                                <Stack spacing={2}>
                                    <Skeleton variant="circular" width={48} height={48} />
                                    <Skeleton variant="text" width="60%" height={40} />
                                    <Skeleton variant="text" width="40%" />
                                </Stack>
                            </Paper>
                        </Grid>
                    ))
                ) : (
                    cards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={2.4} key={index}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    borderRadius: '16px',
                                    background: card.gradient,
                                    color: COLORS.white,
                                    boxShadow: SHADOWS.md,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        transform: 'translateY(-8px)',
                                        boxShadow: SHADOWS.lg,
                                    },
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: -20,
                                        right: -20,
                                        width: 100,
                                        height: 100,
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '50%',
                                    }
                                }}
                            >
                                <Stack spacing={2.5}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 48,
                                            height: 48,
                                            borderRadius: '12px',
                                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                                            color: COLORS.white,
                                            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        {React.cloneElement(card.icon as React.ReactElement, { fontSize: 'medium' })}
                                    </Box>
                                    <Box>
                                        <Typography variant="h3" fontWeight="800" sx={{ mb: 0.5, letterSpacing: '-1px' }}>
                                            {card.value}
                                        </Typography>
                                        <Typography variant="subtitle2" fontWeight="600" sx={{ opacity: 0.9, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '1px' }}>
                                            {card.title}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Grid>
                    ))
                )}
            </Grid>
        </Box>
    );
};

export default HrDashboard;
