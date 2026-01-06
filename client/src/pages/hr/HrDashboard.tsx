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
        console.log("🔍 HrDashboard: Starting fetchStats...");
        try {
            setLoading(true);
            const res = await api.get('hr/dashboard');
            console.log("✅ HrDashboard: Stats received:", res.data);
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

    const cards = useMemo(() => [
        {
            title: t("Total Employees"),
            value: stats?.total_employees || 0,
            icon: <People />,
            color: theme.palette.primary.main,
        },
        {
            title: t("Currently In"),
            value: stats?.currently_in || 0,
            icon: <CheckCircle />,
            color: theme.palette.success.main,
        },
        {
            title: t("Late Arrivals"),
            value: stats?.late_today || 0,
            icon: <Warning />,
            color: theme.palette.warning.main,
        },
        {
            title: t("Early Leave"),
            value: stats?.early_leave_today || 0,
            icon: <TrendingUp />,
            color: theme.palette.secondary.main, // Changed from hardcoded orange
        },
        {
            title: t("Absent"),
            value: stats?.absent_today || 0,
            icon: <Cancel />,
            color: theme.palette.error.main,
        }
    ], [stats, t, theme.palette]);

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default', minHeight: '100vh' }}>
            <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                    <Typography variant="h4" fontWeight="700" sx={{ mb: 1, color: 'text.primary' }}>
                        {t("HR Overview")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t("Real-time workforce monitoring and attendance analytics")}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button 
                        variant="outlined" 
                        size="small"
                        startIcon={<Refresh />} 
                        onClick={fetchStats}
                        disabled={loading}
                        sx={{ borderRadius: '4px' }}
                    >
                        {t("Refresh")}
                    </Button>
                </Stack>
            </Box>

            <Grid container spacing={3} mb={6}>
                {loading ? (
                    [...Array(5)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={2.4} key={`skeleton-${i}`}>
                            <Paper sx={{ p: 3, borderRadius: 2 }}>
                                <Stack spacing={2}>
                                    <Skeleton variant="circular" width={40} height={40} />
                                    <Skeleton variant="text" width="60%" height={32} />
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
                                    borderRadius: 2,
                                    backgroundColor: 'background.paper',
                                    border: `1px solid ${theme.palette.divider}`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        borderColor: card.color,
                                        boxShadow: `0 4px 12px ${alpha(card.color, 0.08)}`,
                                        transform: 'translateY(-2px)',
                                    }
                                }}
                            >
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 40,
                                            height: 40,
                                            borderRadius: '8px',
                                            bgcolor: alpha(card.color, 0.1),
                                            color: card.color,
                                        }}
                                    >
                                        {React.cloneElement(card.icon as React.ReactElement, { fontSize: 'small' })}
                                    </Box>
                                    <Box>
                                        <Typography variant="h5" fontWeight="700" sx={{ mb: 0.5 }}>
                                            {card.value}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight="500">
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
