import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    InputBase,
    alpha,
    useTheme
} from '@mui/material';
import {
    Edit,
    Delete,
    Search,
    FilterList,
    MoreVert,
    Block,
    CheckCircle,
    AccountCircle
} from '@mui/icons-material';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    position?: string;
    is_active: boolean;
    employee_id?: string;
}

interface UserGridProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
    onViewProfile?: (user: User) => void;
}

const UserGrid: React.FC<UserGridProps> = ({ users, onEdit, onDelete, onViewProfile }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    // Ensure users is always an array
    const usersArray = Array.isArray(users) ? users : [];

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'error';
            case 'manager': return 'warning';
            case 'finance': return 'success';
            case 'user': return 'primary';
            default: return 'default';
        }
    };

    const filteredUsers = usersArray.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Box>
            {/* Toolbar */}
            <Box sx={{
                mb: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'background.paper',
                p: 2,
                borderRadius: 2,
                boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
                <Box sx={{
                    position: 'relative',
                    backgroundColor: alpha(theme.palette.text.primary, 0.05),
                    borderRadius: 2,
                    padding: '4px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    width: '300px'
                }}>
                    <Search sx={{ color: 'text.secondary', mr: 1 }} />
                    <InputBase
                        placeholder={t('searchUsers') || 'Search users, roles, departments...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{ width: '100%' }}
                    />
                </Box>

                <Box>
                    <Tooltip title={t('filter')}>
                        <IconButton>
                            <FilterList />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Grid (Styled Table) */}
            <TableContainer component={Paper} elevation={0} sx={{
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                borderRadius: 3,
                overflow: 'hidden'
            }}>
                <Table>
                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary', pl: 3 }}>User</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Role</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Department</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary', pr: 3 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow
                                key={user.id}
                                hover
                                sx={{
                                    '&:last-child td, &:last-child th': { border: 0 },
                                    transition: 'background-color 0.2s',
                                    cursor: 'pointer'
                                }}
                                onClick={() => onViewProfile && onViewProfile(user)}
                            >
                                <TableCell component="th" scope="row" sx={{ pl: 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar
                                            sx={{
                                                bgcolor: theme.palette.primary.main,
                                                width: 40,
                                                height: 40,
                                                fontSize: '1rem',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {user.name.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="600">
                                                {user.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {user.email}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        size="small"
                                        color={getRoleColor(user.role) as any}
                                        variant="filled" // Updated to filled for more pop
                                        sx={{ fontWeight: 500 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {user.department || '-'}
                                    </Typography>
                                    {user.position && (
                                        <Typography variant="caption" color="text.disabled">
                                            {user.position}
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        icon={user.is_active ? <CheckCircle fontSize="small" /> : <Block fontSize="small" />}
                                        label={user.is_active ? 'Active' : 'Inactive'}
                                        size="small"
                                        color={user.is_active ? 'success' : 'default'}
                                        variant="outlined"
                                        sx={{ border: 'none', bgcolor: user.is_active ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.grey[500], 0.1) }}
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ pr: 3 }} onClick={(e) => e.stopPropagation()}>
                                    <Tooltip title={t('edit')}>
                                        <IconButton size="small" onClick={() => onEdit(user)} sx={{ color: 'primary.main' }}>
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title={t('delete')}>
                                        <IconButton size="small" onClick={() => onDelete(user.id)} sx={{ color: 'error.main' }}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default UserGrid;
