import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Button,
    Alert,
    Fade
} from '@mui/material';
import {
    Person,
    Security,
    Business,
    Add
} from '@mui/icons-material';

import UserGrid from './UserGrid';
import RoleManager from './RoleManager';
import UserProfileDrawer from './UserProfileDrawer';
import DepartmentsManager from './DepartmentsManager';
import api from '../../../services/api';

const UserManagementNew: React.FC = () => {
    const { t } = useTranslation();

    // State
    const [activeTab, setActiveTab] = useState(0);
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [openDrawer, setOpenDrawer] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Constants
    const roles = ['admin', 'manager', 'finance', 'user', 'viewer'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, deptsRes, posRes] = await Promise.all([
                api.get('/users/'),
                api.get('/departments'),
                api.get('/positions')
            ]);
            // Ensure we always have arrays
            const usersData = Array.isArray(usersRes.data) ? usersRes.data :
                              (usersRes.data?.users || usersRes.data?.data || []);
            setUsers(usersData);
            setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || []));
            setPositions(Array.isArray(posRes.data) ? posRes.data : (posRes.data?.data || []));
        } catch (err: any) {
            console.error('Failed to load data:', err);
            setError("Failed to load data - you may not have admin permissions");
        }
    };

    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setOpenDrawer(true);
    };

    const handleCreateUser = () => {
        setSelectedUser(null); // New user mode
        setOpenDrawer(true);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm(t('confirmDeleteUser'))) return;
        try {
            await api.delete('/hr/employees', { data: [userId] });
            setUsers(prev => prev.filter((u: any) => u.id !== userId));
        } catch (err) {
            setError("Failed to delete user");
        }
    };

    const handleSaveUser = async (userData: any) => {
        try {
            if (userData.id) {
                // Update
                const res = await api.put(`/hr/employees/${userData.id}`, userData);
                setUsers(prev => prev.map((u: any) => u.id === userData.id ? res.data : u));
            } else {
                // Create
                // Need to ensure password is set for new users (logic handled inside Drawer mostly or API)
                // For simplicity, we assume simple create here or Drawer handles validation
                const res = await api.post('/auth/register', { ...userData, password: userData.password || '123456' });
                setUsers(prev => [...prev, res.data]);
            }
            fetchData(); // Refresh to be sure
        } catch (err: any) {
            console.error(err);
            throw err; // Propagate to drawer to show error
        }
    };

    return (
        <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: 3 }}>

            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary', mb: 1 }}>
                        System Settings
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage users, access controls, and organization structure.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={handleCreateUser}
                    sx={{ borderRadius: 2, px: 3, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}
                >
                    Add New User
                </Button>
            </Box>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                    mb: 3,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '1rem', mr: 2 }
                }}
            >
                <Tab icon={<Person fontSize="small" sx={{ mb: 0, mr: 1 }} />} iconPosition="start" label="Users Directory" />
                <Tab icon={<Security fontSize="small" sx={{ mb: 0, mr: 1 }} />} iconPosition="start" label="Roles & Permissions" />
                <Tab icon={<Business fontSize="small" sx={{ mb: 0, mr: 1 }} />} iconPosition="start" label="Departments" />
            </Tabs>

            {/* Content Area */}
            <Box sx={{ position: 'relative', minHeight: 500 }}>
                {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

                {activeTab === 0 && (
                    <Fade in={activeTab === 0}>
                        <Box>
                            <UserGrid
                                users={users}
                                onEdit={handleEditUser}
                                onDelete={handleDeleteUser}
                            />
                        </Box>
                    </Fade>
                )}

                {activeTab === 1 && (
                    <Fade in={activeTab === 1}>
                        <Box sx={{ height: 600 }}>
                            <RoleManager />
                        </Box>
                    </Fade>
                )}

                {activeTab === 2 && (
                    <Fade in={activeTab === 2}>
                        <Box sx={{ height: 600 }}>
                            <DepartmentsManager />
                        </Box>
                    </Fade>
                )}
            </Box>

            {/* Profile Drawer */}
            <UserProfileDrawer
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                user={selectedUser || {}}
                onSave={handleSaveUser}
                departments={departments}
                positions={positions}
                roles={roles}
            />

        </Box>
    );
};

export default UserManagementNew;
