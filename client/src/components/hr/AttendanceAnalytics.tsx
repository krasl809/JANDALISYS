import React, { useMemo } from 'react';
import {
    Box, Grid, Paper, Typography, useTheme, alpha, Avatar
} from '@mui/material';
import {
    XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Tooltip as RechartsTooltip, AreaChart, Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { format, eachDayOfInterval } from 'date-fns';
import { Schedule, Timer, TrendingUp } from '@mui/icons-material';

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
    gradientSuccess: 'linear-gradient(135deg, #2DCE89 0%, #2DCECC 100%)',
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

const ATTENDANCE_COLORS = {
    present: COLORS.success,
    late: COLORS.error,
    earlyLeave: COLORS.warning,
    absent: COLORS.secondary,
    ongoing: COLORS.primary,
    overtime: '#7C3AED',
};

interface AttendanceAnalyticsProps {
    data: any[];
    employees: any[];
    startDate: Date;
    endDate: Date;
}

const AnalyticsMetric = ({ title, value, icon, color, gradient }: { title: string, value: string | number, icon: any, color: string, gradient: string }) => {
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
                    color: COLORS.white,
                    boxShadow: SHADOWS.sm,
                    borderRadius: '12px'
                }}
            >
                {icon}
            </Avatar>
            <Box>
                <Typography variant="caption" color={COLORS.secondary} fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {title}
                </Typography>
                <Typography variant="h5" fontWeight="800" color={COLORS.dark} sx={{ lineHeight: 1.2, mt: 0.5 }}>
                    {value}
                </Typography>
            </Box>
        </Paper>
    );
};

const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ data, employees, startDate, endDate }) => {
    const { t } = useTranslation();
    const theme = useTheme();

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
        const counts = {
            present: data.filter(l => l.status === 'present').length,
            late: data.filter(l => l.status === 'late').length,
            earlyLeave: data.filter(l => l.status === 'early_leave').length,
            absent: Math.max(0, (employees.length * trendData.length) - data.length)
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
        const departments = Array.from(new Set(employees.map(e => e.department_name).filter(Boolean)));
        return departments.map(dept => {
            const deptEmployees = employees.filter(e => e.department_name === dept);
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
                        <Box sx={{ width: '100%', height: '85%' }}>
                            <ResponsiveContainer width="100%" height="100%">
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
                                            fontWeight: 700
                                        }}
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
                        <Box sx={{ width: '100%', height: '85%' }}>
                            <ResponsiveContainer width="100%" height="100%">
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
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', boxShadow: SHADOWS.md, border: 'none' }} />
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
                        <Box sx={{ height: '85%', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
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
                                    <RechartsTooltip cursor={{ fill: alpha(COLORS.primary, 0.05) }} contentStyle={{ borderRadius: '12px', boxShadow: SHADOWS.md, border: 'none' }} />
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
                        <Box sx={{ height: '85%', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
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
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', boxShadow: SHADOWS.md, border: 'none' }} />
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
