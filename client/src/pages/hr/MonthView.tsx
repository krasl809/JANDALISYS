import React, { useMemo } from 'react';
import {
    Box, Typography, Paper, Avatar, TablePagination,
    useTheme
} from '@mui/material';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isWeekend } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { ATTENDANCE_COLORS } from './AttendancePage';

interface AttendanceRecord {
    id: string;
    employee_id: string;
    employee_name: string;
    check_in_date: string;
    check_in: string;
    check_out?: string;
    break_hours?: number;
    actual_work: number;
    capacity: number;
    overtime: number;
    status: string;
    shift_name?: string;
    late_minutes?: number;
    early_leave_minutes?: number;
    timestamp?: string;
    type?: string;
    raw_status?: string;
    verification_mode?: string;
    device?: string;
    device_ip?: string;
    employee_pk?: string;
}

interface MonthViewProps {
    rows: AttendanceRecord[];
    employees: any[];
    filters: any;
    totalEmployees: number;
    page: number;
    rowsPerPage: number;
    handlePageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const MonthView: React.FC<MonthViewProps> = React.memo(({
    rows,
    employees,
    filters,
    totalEmployees,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange
}) => {
    const theme = useTheme();
    const { t } = useTranslation();

    // Memoized days calculation
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: filters.startDate || startOfMonth(new Date()),
            end: filters.endDate || endOfMonth(new Date())
        });
    }, [filters.startDate, filters.endDate]);

    // Memoized employee attendance mapping
    const employeeAttendanceMap = useMemo(() => {
        const map: { [employeeId: string]: { [dateKey: string]: AttendanceRecord[] } } = {};

        rows.forEach((record) => {
            const employeeId = record.employee_id;
            const dateKey = record.check_in_date;

            if (!map[employeeId]) {
                map[employeeId] = {};
            }
            if (!map[employeeId][dateKey]) {
                map[employeeId][dateKey] = [];
            }
            map[employeeId][dateKey].push(record);
        });

        return map;
    }, [rows]);

    // Memoized paginated employees
    const paginatedEmployees = useMemo(() => {
        return employees.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    }, [employees, page, rowsPerPage]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return ATTENDANCE_COLORS.present;
            case 'late': return ATTENDANCE_COLORS.late;
            case 'early_leave': return ATTENDANCE_COLORS.earlyLeave;
            case 'ongoing': return ATTENDANCE_COLORS.ongoing;
            default: return ATTENDANCE_COLORS.absent;
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Paper sx={{
                borderRadius: 1,
                overflow: 'hidden',
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: 'background.paper'
            }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: 600 }}>
                    {/* Month Header */}
                    <Box sx={{
                        display: 'flex',
                        backgroundColor: 'background.default',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        p: 1.5
                    }}>
                        <Typography variant="h6" fontWeight="600" color="primary">
                            {filters.startDate ? format(filters.startDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')}
                        </Typography>
                    </Box>

                    {/* Month Grid */}
                    <Box sx={{ display: 'flex', flexGrow: 1, overflowY: 'auto', position: 'relative' }}>
                        {/* Employee Names Column */}
                        <Box sx={{
                            width: 180,
                            flexShrink: 0,
                            backgroundColor: 'background.default',
                            borderRight: `1px solid ${theme.palette.divider}`
                        }}>
                            {paginatedEmployees.map((employee, index) => (
                                <Box key={employee.id || employee.employee_id} sx={{
                                    height: 50,
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 1.5,
                                    borderBottom: `1px solid ${theme.palette.divider}`,
                                    backgroundColor: index % 2 === 0 ? 'transparent' : 'action.hover'
                                }}>
                                    <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: ATTENDANCE_COLORS.present, fontSize: '0.75rem' }}>
                                        {employee.name?.[0]}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight="500">{employee.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{employee.employee_id}</Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>

                        {/* Days Columns */}
                        <Box sx={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
                            {days.map((day, dIdx) => (
                                <Box key={dIdx} sx={{
                                    flex: 1,
                                    position: 'relative',
                                    borderLeft: `1px solid ${theme.palette.divider}`,
                                    backgroundColor: isWeekend(day) ? 'action.hover' : 'transparent'
                                }}>
                                    {/* Day Header */}
                                    <Box sx={{
                                        height: 50,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderBottom: `1px solid ${theme.palette.divider}`,
                                        backgroundColor: isToday(day) ? 'action.selected' : 'transparent'
                                    }}>
                                        <Typography variant="caption" fontWeight="600" color={isToday(day) ? 'primary' : 'text.secondary'}>
                                            {format(day, 'EEE')}
                                        </Typography>
                                        <Typography variant="body2" fontWeight="600" color={isToday(day) ? 'primary' : 'text.primary'}>
                                            {format(day, 'd')}
                                        </Typography>
                                    </Box>

                                    {/* Employee Rows */}
                                    {paginatedEmployees.map((employee, eIdx) => {
                                        const employeeAttendance = employeeAttendanceMap[employee.employee_id]?.[format(day, 'yyyy-MM-dd')] || [];

                                        return (
                                            <Box key={employee.id || employee.employee_id} sx={{
                                                height: 50,
                                                borderBottom: `1px solid ${theme.palette.divider}`,
                                                backgroundColor: eIdx % 2 === 0 ? 'transparent' : 'action.hover',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 0.5
                                            }}>
                                                {employeeAttendance.length > 0 ? (
                                                    employeeAttendance.map((session, sIdx) => {
                                                        const statusColor = getStatusColor(session.status);

                                                        return (
                                                            <Box
                                                                key={sIdx}
                                                                onClick={() => console.log('Month view session:', session)}
                                                                sx={{
                                                                    width: '85%',
                                                                    height: '70%',
                                                                    borderRadius: 1,
                                                                    backgroundColor: statusColor,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 500,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    '&:hover': {
                                                                        opacity: 0.8,
                                                                        transform: 'scale(1.02)'
                                                                    }
                                                                }}
                                                            >
                                                                <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1, fontWeight: 600 }}>
                                                                    {format(parseISO(session.check_in), 'HH:mm')}
                                                                </Typography>
                                                                {session.actual_work > 0 && (
                                                                    <Typography variant="caption" sx={{ fontSize: '0.5rem', opacity: 0.9 }}>
                                                                        {session.actual_work}h
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        );
                                                    })
                                                ) : (
                                                    <Box sx={{
                                                        width: 6,
                                                        height: 6,
                                                        borderRadius: '50%',
                                                        backgroundColor: ATTENDANCE_COLORS.absent,
                                                        opacity: 0.4
                                                    }} />
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>
            </Paper>
            <TablePagination
                component="div"
                count={totalEmployees}
                page={page}
                onPageChange={handlePageChange}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sx={{ mt: 2 }}
            />
        </Box>
    );
});

export default MonthView;