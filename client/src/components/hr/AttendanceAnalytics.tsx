import React, { useMemo } from 'react';
import {
    Box, Grid, Paper, Typography, useTheme, Card, CardContent, Divider
} from '@mui/material';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Tooltip as RechartsTooltip
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { ATTENDANCE_COLORS } from '../../pages/hr/AttendancePage';

interface AttendanceAnalyticsProps {
    data: any[];
    employees: any[];
    startDate: Date;
    endDate: Date;
}

const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ data, employees, startDate, endDate }) => {
    const { t } = useTranslation();
    const theme = useTheme();

    // 1. Prepare Trend Data
    const trendData = useMemo(() => {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayLogs = data.filter(log => log.check_in_date === dateStr);
            const presentCount = new Set(dayLogs.map(l => l.employee_id)).size;
            const attendanceRate = employees.length > 0 ? (presentCount / employees.length) * 100 : 0;
            
            return {
                date: format(day, 'MMM dd'),
                rate: Math.round(attendanceRate),
                present: presentCount,
                total: employees.length
            };
        });
    }, [data, employees, startDate, endDate]);

    // 2. Prepare Status Distribution Data
    const statusData = useMemo(() => {
        const counts = {
            present: data.filter(l => l.status === 'present').length,
            late: data.filter(l => l.status === 'late').length,
            earlyLeave: data.filter(l => l.status === 'early_leave').length,
            absent: (employees.length * trendData.length) - data.length // Simplified estimation
        };

        return [
            { name: t('Present'), value: counts.present, color: ATTENDANCE_COLORS.present },
            { name: t('Late'), value: counts.late, color: ATTENDANCE_COLORS.late },
            { name: t('Early Leave'), value: counts.earlyLeave, color: ATTENDANCE_COLORS.earlyLeave },
            { name: t('Absent'), value: Math.max(0, counts.absent), color: ATTENDANCE_COLORS.absent },
        ].filter(item => item.value > 0);
    }, [data, employees, trendData, t]);

    // 3. Prepare Department Performance
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
            <Grid container spacing={3}>
                {/* Attendance Trend Line Chart */}
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                            {t('Attendance Trend (%)')}
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
                                <XAxis dataKey="date" stroke={theme.palette.text.secondary} fontSize={12} />
                                <YAxis stroke={theme.palette.text.secondary} fontSize={12} domain={[0, 100]} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: theme.shadows[3] }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="rate" 
                                    stroke={ATTENDANCE_COLORS.present} 
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: ATTENDANCE_COLORS.present }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Status Distribution Pie Chart */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                            {t('Status Distribution')}
                        </Typography>
                        <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Department Performance Bar Chart */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                            {t('Attendance by Department (%)')}
                        </Typography>
                        <Box sx={{ height: 300, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.palette.divider} />
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" width={150} stroke={theme.palette.text.secondary} fontSize={12} />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                                    <Bar 
                                        dataKey="rate" 
                                        fill={ATTENDANCE_COLORS.ongoing} 
                                        radius={[0, 4, 4, 0]} 
                                        barSize={20}
                                        label={{ position: 'right', formatter: (val: any) => `${val}%`, fontSize: 12 }}
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
