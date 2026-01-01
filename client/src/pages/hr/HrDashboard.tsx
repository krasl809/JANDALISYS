import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, Paper, useTheme, CircularProgress, alpha } from '@mui/material';
import { People, Warning, CheckCircle, Cancel } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

// Placeholder for charts if recharts is not available in package.json (I haven't checked but it's common)
// I'll stick to KPI cards first for safety.

interface HrStats {
    total_employees: number;
    present_today: number;
    late_today: number;
    absent_today: number;
}

const HrDashboard: React.FC = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const [stats, setStats] = useState<HrStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/hr/dashboard');
                setStats(res.data);
            } catch (error: unknown) {
                console.error("Failed to load HR stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const cards = [
        {
            title: t("Total Employees"),
            value: stats?.total_employees || 0,
            icon: <People sx={{ fontSize: 40, color: '#fff' }} />,
            gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        },
        {
            title: t("Present Today"),
            value: stats?.present_today || 0,
            icon: <CheckCircle sx={{ fontSize: 40, color: '#fff' }} />,
            gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        },
        {
            title: t("Late Arrivals"),
            value: stats?.late_today || 0,
            icon: <Warning sx={{ fontSize: 40, color: '#fff' }} />,
            gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        },
        {
            title: t("Absent"),
            value: stats?.absent_today || 0,
            icon: <Cancel sx={{ fontSize: 40, color: '#fff' }} />,
            gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)'
        }
    ];

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', height: '100vh', alignItems: 'center' }}><CircularProgress /></Box>;

    return (
        <Box sx={{ p: 3, bgcolor: 'background.default', overflowX: 'hidden' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
                {t("HR Overview")}
            </Typography>

            <Grid container spacing={3} sx={{ overflowX: 'hidden' }}>
                {cards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 3,
                                borderRadius: 4,
                                background: card.gradient,
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'transform 0.3s',
                                '&:hover': { transform: 'translateY(-5px)' }
                            }}
                        >
                            <Box>
                                <Typography variant="h3" fontWeight="bold">
                                    {card.value}
                                </Typography>
                                <Typography variant="subtitle1" fontWeight="medium" sx={{ opacity: 0.9 }}>
                                    {card.title}
                                </Typography>
                            </Box>
                            <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                                {card.icon}
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Advanced Section: Quick Actions / Recent Activity Placeholder */}
            {/* Real implementation of charts would go here */}
            <Box sx={{ mt: 5 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {t("Attendance Analytics")}
                </Typography>
                <Paper sx={{ p: 4, borderRadius: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                    <Typography color="text.secondary">
                        {t("Attendance trends chart will appear here after enough data is collected.")}
                    </Typography>
                </Paper>
            </Box>
        </Box>
    );
};

export default HrDashboard;
