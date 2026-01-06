import React, { useMemo } from 'react';
import {
    Box, Grid, Paper, Typography, useTheme, alpha
} from '@mui/material';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Tooltip as RechartsTooltip, AreaChart, Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { format, eachDayOfInterval } from 'date-fns';
import { ATTENDANCE_COLORS } from '../../pages/hr/AttendancePage';
import { Schedule, Timer, TrendingUp } from '@mui/icons-material';

interface AttendanceAnalyticsProps {
    data: any[];
    employees: any[];
    startDate: Date;
    endDate: Date;
}

const AnalyticsMetric = ({ title, value, icon, color }: { title: string, value: string | number, icon: any, color: string }) => {
    const theme = useTheme();
    return (
        <Paper sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(color, 0.1), color: color, display: 'flex' }}>
                {icon}
            </Box>
            <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="600">{title}</Typography>
                <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.2 }}>{value}</Typography>
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
            { title: t('Avg Attendance Rate'), value: `${Math.round(totalAttendance)}%`, icon: <TrendingUp />, color: ATTENDANCE_COLORS.present },
            { title: t('Avg Work Hours'), value: `${Math.round(avgWork * 10) / 10}h`, icon: <Timer />, color: ATTENDANCE_COLORS.ongoing },
            { title: t('Avg Late Rate'), value: `${Math.round(avgLateRate)}%`, icon: <Schedule />, color: ATTENDANCE_COLORS.late },
            { title: t('Total Overtime'), value: `${Math.round(totalOvertime)}h`, icon: <TrendingUp />, color: ATTENDANCE_COLORS.overtime },
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
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {metrics.map((m, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                        <AnalyticsMetric {...m} />
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Attendance & Lateness Trend Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 450 }}>
                        <Typography variant="h6" fontWeight="700" gutterBottom>
                            {t('Attendance & Lateness Trend (%)')}
                        </Typography>
                        <Box sx={{ width: '100%', height: '85%', mt: 2 }}>
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
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                    <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={12} />
                                    <YAxis stroke={theme.palette.text.secondary} fontSize={12} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: theme.shadows[10], padding: '12px' }}
                                    />
                                    <Legend verticalAlign="top" align="right" height={36}/>
                                    <Area 
                                        name={t('Attendance Rate')}
                                        type="monotone" 
                                        dataKey="rate" 
                                        stroke={ATTENDANCE_COLORS.present} 
                                        fillOpacity={1} 
                                        fill="url(#colorRate)" 
                                        strokeWidth={3}
                                    />
                                    <Area 
                                        name={t('Late Rate')}
                                        type="monotone" 
                                        dataKey="lateRate" 
                                        stroke={ATTENDANCE_COLORS.late} 
                                        fillOpacity={1} 
                                        fill="url(#colorLate)" 
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Status Distribution Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 450 }}>
                        <Typography variant="h6" fontWeight="700" gutterBottom>
                            {t('Overall Status')}
                        </Typography>
                        <Box sx={{ width: '100%', height: '85%', mt: 2 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: 12 }} />
                                    <Legend 
                                        verticalAlign="bottom" 
                                        layout="horizontal" 
                                        iconType="circle"
                                        formatter={(value) => <span style={{ color: theme.palette.text.primary, fontWeight: 500 }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Overtime Distribution Bar Chart */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
                        <Typography variant="h6" fontWeight="700" gutterBottom>
                            {t('Overtime Distribution (Count)')}
                        </Typography>
                        <Box sx={{ height: '85%', width: '100%', mt: 2 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={overtimeData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} fontSize={12} />
                                    <YAxis stroke={theme.palette.text.secondary} fontSize={12} />
                                    <RechartsTooltip cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />
                                    <Bar 
                                        dataKey="value" 
                                        fill={ATTENDANCE_COLORS.overtime} 
                                        radius={[4, 4, 0, 0]} 
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* Department Performance Bar Chart */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
                        <Typography variant="h6" fontWeight="700" gutterBottom>
                            {t('Department Ranking (%)')}
                        </Typography>
                        <Box sx={{ height: '85%', width: '100%', mt: 2 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.palette.divider} />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" width={120} stroke={theme.palette.text.secondary} fontSize={12} />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                    <Bar 
                                        dataKey="rate" 
                                        fill={ATTENDANCE_COLORS.ongoing} 
                                        radius={[0, 4, 4, 0]} 
                                        barSize={15}
                                        label={{ position: 'right', formatter: (val: any) => `${val}%`, fontSize: 11, fontWeight: 600 }}
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
