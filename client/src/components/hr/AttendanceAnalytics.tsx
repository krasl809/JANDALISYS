import React, { useMemo } from 'react';
import {
    Box, Grid, Paper, Typography, useTheme, alpha, Avatar, Theme
} from '@mui/material';
import {
    XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Tooltip as RechartsTooltip, AreaChart, Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { format, eachDayOfInterval } from 'date-fns';
import { Schedule, Timer, TrendingUp } from '@mui/icons-material';

// --- Theme-Aware Utilities ---
const getAttendanceColors = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    return {
        primary: theme.palette.primary.main,
        secondary: theme.palette.text.secondary,
        info: theme.palette.info.main,
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        dark: theme.palette.text.primary,
        light: theme.palette.background.default,
        bg: theme.palette.background.default,
        white: theme.palette.background.paper,
        pureWhite: isDark ? theme.palette.background.paper : '#FFFFFF',
        gradientPrimary: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        gradientSuccess: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
        gradientInfo: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
        gradientWarning: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
        gradientError: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
        gradientDark: isDark 
            ? `linear-gradient(135deg, ${theme.palette.grey[800]} 0%, ${theme.palette.common.black} 100%)`
            : `linear-gradient(135deg, #344767 0%, #192941 100%)`,
    };
};

const getAttendanceShadows = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(50, 50, 93, 0.1)';
    return {
        xs: isDark ? '0 1px 3px rgba(0, 0, 0, 0.4)' : '0 1px 5px rgba(0, 0, 0, 0.05)',
        sm: isDark ? '0 4px 6px rgba(0, 0, 0, 0.5)' : '0 3px 8px rgba(0, 0, 0, 0.08)',
        md: isDark ? '0 8px 16px rgba(0, 0, 0, 0.6)' : `0 7px 14px ${shadowColor}`,
        lg: isDark ? '0 12px 24px rgba(0, 0, 0, 0.7)' : `0 15px 35px ${shadowColor}`,
    };
};

const getAttendanceStatusColors = (colors: any) => ({
    present: colors.success,
    late: colors.warning,
    earlyLeave: colors.info,
    absent: colors.secondary,
    ongoing: colors.primary,
    overtime: alpha(colors.primary, 0.8),
});

interface AttendanceAnalyticsProps {
    data: any[];
    employees: any[];
    startDate: Date;
    endDate: Date;
}

const AnalyticsMetric = ({ title, value, icon, color, gradient }: { title: string, value: string | number, icon: any, color: string, gradient: string }) => {
    const theme = useTheme();
    const COLORS = useMemo(() => getAttendanceColors(theme), [theme]);
    const SHADOWS = useMemo(() => getAttendanceShadows(theme), [theme]);

    return (
        <Paper 
            elevation={0}
            sx={{ 
                p: 2.5, 
                borderRadius: '16px', 
                bgcolor: COLORS.white,
                boxShadow: SHADOWS.md,
                display: 'flex', 
                alignItems: 'center', 
                gap: 2.5,
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    transition: 'all 0.3s ease-in-out'
                }
            }}
        >
            <Avatar
                sx={{ 
                    width: 48, 
                    height: 48, 
                    background: gradient,
                    color: COLORS.pureWhite,
                    boxShadow: SHADOWS.sm,
                    borderRadius: '12px'
                }}
            >
                {icon}
            </Avatar>
            <Box>
                <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: "700", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {title}
                </Typography>
                <Typography variant="h5" fontWeight="800" sx={{ color: COLORS.dark, lineHeight: 1.2, mt: 0.5 }}>
                    {value}
                </Typography>
            </Box>
        </Paper>
    );
};

const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ data, employees, startDate, endDate }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const COLORS = useMemo(() => getAttendanceColors(theme), [theme]);
    const SHADOWS = useMemo(() => getAttendanceShadows(theme), [theme]);
    const ATTENDANCE_COLORS = useMemo(() => getAttendanceStatusColors(COLORS), [COLORS]);

    // 1. Prepare Trend Data (Attendance & Lateness)
    const trendData = useMemo(() => {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayLogs = data.filter(log => log.check_in_date === dateStr);
            const presentCount = new Set(dayLogs.map(l => l.employee_id)).size;
            const lateCount = dayLogs.filter(l => l.status === 'late').length;
            
            const attendanceRate = employees.length > 0 ? (presentCount / employees.length) * 100 : 0;
            const lateRate = presentCount > 0 ? (lateCount / presentCount) * 100 : 0;
            
            return {
                date: format(day, 'MMM dd'),
                rate: Math.round(attendanceRate),
                lateRate: Math.round(lateRate),
                present: presentCount,
                late: lateCount,
                total: employees.length
            };
        });
    }, [data, employees, startDate, endDate]);

    // 2. Prepare Overtime Distribution
    const overtimeData = useMemo(() => {
        const overtimeLogs = data.filter(l => l.overtime > 0);
        const ranges = [
            { name: '0-1h', min: 0, max: 1 },
            { name: '1-2h', min: 1, max: 2 },
            { name: '2-4h', min: 2, max: 4 },
            { name: '4h+', min: 4, max: 24 }
        ];

        return ranges.map(r => ({
            name: r.name,
            value: overtimeLogs.filter(l => l.overtime > r.min && l.overtime <= r.max).length
        })).filter(r => r.value > 0);
    }, [data]);

    // 3. Prepare Status Distribution Data
    const statusData = useMemo(() => {
        // Calculate unique presence per day to get accurate absence
        const daysCount = trendData.length;
        const totalExpectedPresences = employees.length * daysCount;
        
        // Count unique employee presence per day
        const uniquePresencesPerDay = new Set();
        data.forEach(log => {
            uniquePresencesPerDay.add(`${log.employee_id}-${log.check_in_date}`);
        });
        
        const actualPresencesCount = uniquePresencesPerDay.size;
        const absentCount = Math.max(0, totalExpectedPresences - actualPresencesCount);

        const counts = {
            present: data.filter(l => l.status === 'present').length,
            late: data.filter(l => l.status === 'late').length,
            earlyLeave: data.filter(l => l.status === 'early_leave').length,
            absent: absentCount
        };

        return [
            { name: t('Present'), value: counts.present, color: ATTENDANCE_COLORS.present },
            { name: t('Late'), value: counts.late, color: ATTENDANCE_COLORS.late },
            { name: t('Early Leave'), value: counts.earlyLeave, color: ATTENDANCE_COLORS.earlyLeave },
            { name: t('Absent'), value: counts.absent, color: ATTENDANCE_COLORS.absent },
        ].filter(item => item.value > 0);
    }, [data, employees, trendData, t]);

    // 4. Prepare Summary Metrics
    const metrics = useMemo(() => {
        const avgWork = data.length > 0 ? data.reduce((acc, curr) => acc + (curr.actual_work || 0), 0) / data.length : 0;
        const totalOvertime = data.reduce((acc, curr) => acc + (curr.overtime || 0), 0);
        const avgLateRate = trendData.length > 0 ? trendData.reduce((acc, curr) => acc + curr.lateRate, 0) / trendData.length : 0;
        const totalAttendance = trendData.reduce((acc, curr) => acc + curr.rate, 0) / trendData.length;

        return [
            { title: t('Avg Attendance Rate'), value: `${Math.round(totalAttendance)}%`, icon: <TrendingUp />, color: ATTENDANCE_COLORS.present, gradient: COLORS.gradientSuccess },
            { title: t('Avg Work Hours'), value: `${Math.round(avgWork * 10) / 10}h`, icon: <Timer />, color: ATTENDANCE_COLORS.ongoing, gradient: COLORS.gradientPrimary },
            { title: t('Avg Late Rate'), value: `${Math.round(avgLateRate)}%`, icon: <Schedule />, color: ATTENDANCE_COLORS.late, gradient: COLORS.gradientError },
            { title: t('Total Overtime'), value: `${Math.round(totalOvertime)}h`, icon: <TrendingUp />, color: ATTENDANCE_COLORS.overtime, gradient: COLORS.gradientWarning },
        ];
    }, [data, trendData, t]);

    // 5. Prepare Department Performance
    const deptData = useMemo(() => {
        const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
        return departments.map(dept => {
            const deptEmployees = employees.filter(e => e.department === dept);
            const deptLogs = data.filter(log => deptEmployees.some(e => e.employee_id === log.employee_id));
            
            const attendanceRate = deptEmployees.length > 0 
                ? (new Set(deptLogs.map(l => l.employee_id)).size / (deptEmployees.length * trendData.length)) * 100 
                : 0;

            return {
                name: dept,
                rate: Math.round(attendanceRate)
            };
        }).sort((a, b) => b.rate - a.rate);
    }, [data, employees, trendData]);

    return (
        <Box sx={{ mt: 2 }}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {metrics.map((m, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                        <AnalyticsMetric {...m} />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Attendance & Lateness Trend Chart */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: COLORS.white, boxShadow: SHADOWS.md, height: 500 }}>
                        <Typography variant="h6" fontWeight="800" color={COLORS.dark} sx={{ mb: 3 }}>
                            {t('Attendance & Lateness Trend (%)')}
                        </Typography>
                        <Box sx={{ width: '100%', height: '85%', overflow: 'hidden' }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={ATTENDANCE_COLORS.present} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={ATTENDANCE_COLORS.present} stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={ATTENDANCE_COLORS.late} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={ATTENDANCE_COLORS.late} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.light} />
                                    <XAxis 
                                        dataKey="date" 
                                        stroke={COLORS.secondary} 
                                        fontSize={12} 
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke={COLORS.secondary} 
                                        fontSize={12} 
                                        fontWeight={600}
                                        domain={[0, 100]} 
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <RechartsTooltip 
                                        contentStyle={{ 
                                            borderRadius: '12px', 
                                            border: 'none', 
                                            boxShadow: SHADOWS.lg, 
                                            padding: '12px',
                                            fontWeight: 700,
                                            backgroundColor: COLORS.white,
                                            color: COLORS.dark
                                        }}
                                        itemStyle={{ color: COLORS.dark }}
                                        cursor={{ stroke: alpha(COLORS.primary, 0.2), strokeWidth: 2 }}
                                    />
                                    <Legend 
                                        verticalAlign="top" 
                                        align="right" 
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span style={{ color: COLORS.dark, fontWeight: 700, fontSize: '0.85rem' }}>{value}</span>}
                                    />
                                    <Area 
                                        name={t('Attendance Rate')}
                                        type="monotone" 
                                        dataKey="rate" 
                                        stroke={ATTENDANCE_COLORS.present} 
                                        fillOpacity={1} 
                                        fill="url(#colorRate)" 
                                        strokeWidth={4}
                                    />
                                    <Area 
                                        name={t('Late Rate')}
                                        type="monotone" 
                                        dataKey="lateRate" 
                                        stroke={ATTENDANCE_COLORS.late} 
                                        fillOpacity={1} 
                                        fill="url(#colorLate)" 
                                        strokeWidth={3}
                                        strokeDasharray="5 5"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Status Distribution Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: COLORS.white, boxShadow: SHADOWS.md, height: 500 }}>
                        <Typography variant="h6" fontWeight="800" color={COLORS.dark} sx={{ mb: 3 }}>
                            {t('Overall Status')}
                        </Typography>
                        <Box sx={{ width: '100%', height: '85%', overflow: 'hidden' }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ 
                                            borderRadius: '12px', 
                                            boxShadow: SHADOWS.md, 
                                            border: 'none',
                                            backgroundColor: COLORS.white,
                                            color: COLORS.dark
                                        }} 
                                        itemStyle={{ color: COLORS.dark }}
                                    />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        layout="horizontal" 
                                        iconType="circle"
                                        formatter={(value) => <span style={{ color: COLORS.dark, fontWeight: 700, fontSize: '0.85rem' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Overtime Distribution Bar Chart */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: COLORS.white, boxShadow: SHADOWS.md, height: 400 }}>
                        <Typography variant="h6" fontWeight="800" color={COLORS.dark} sx={{ mb: 3 }}>
                            {t('Overtime Distribution (Count)')}
                        </Typography>
                        <Box sx={{ height: '85%', width: '100%', overflow: 'hidden' }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <BarChart data={overtimeData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.light} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke={COLORS.secondary} 
                                        fontSize={12} 
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        dy={10}
                                    />
                                    <YAxis 
                                        stroke={COLORS.secondary} 
                                        fontSize={12} 
                                        fontWeight={600}
                                        tickLine={false}
                                        axisLine={false}
                                        dx={-10}
                                    />
                                    <RechartsTooltip 
                                        cursor={{ fill: alpha(COLORS.primary, 0.05) }} 
                                        contentStyle={{ 
                                            borderRadius: '12px', 
                                            boxShadow: SHADOWS.md, 
                                            border: 'none',
                                            backgroundColor: COLORS.white,
                                            color: COLORS.dark
                                        }} 
                                        itemStyle={{ color: COLORS.dark }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill={ATTENDANCE_COLORS.overtime} 
                                        radius={[8, 8, 0, 0]} 
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Department Performance Bar Chart */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '16px', bgcolor: COLORS.white, boxShadow: SHADOWS.md, height: 400 }}>
                        <Typography variant="h6" fontWeight="800" color={COLORS.dark} sx={{ mb: 3 }}>
                            {t('Department Ranking (%)')}
                        </Typography>
                        <Box sx={{ height: '85%', width: '100%', overflow: 'hidden' }}>
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <BarChart data={deptData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.light} />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        width={120} 
                                        stroke={COLORS.secondary} 
                                        fontSize={12} 
                                        fontWeight={700}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <RechartsTooltip 
                                        cursor={{ fill: alpha(COLORS.primary, 0.05) }} 
                                        contentStyle={{ 
                                            borderRadius: '12px', 
                                            boxShadow: SHADOWS.md, 
                                            border: 'none',
                                            backgroundColor: COLORS.white,
                                            color: COLORS.dark
                                        }} 
                                        itemStyle={{ color: COLORS.dark }}
                                    />
                                    <Bar 
                                        dataKey="rate" 
                                        fill={COLORS.primary} 
                                        radius={[0, 8, 8, 0]} 
                                        barSize={18}
                                        label={{ position: 'right', formatter: (val: any) => `${val}%`, fontSize: 12, fontWeight: 700, fill: COLORS.dark }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AttendanceAnalytics;
