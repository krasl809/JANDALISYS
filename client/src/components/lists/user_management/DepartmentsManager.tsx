import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    CircularProgress,
    alpha,
    Theme,
    useTheme
} from '@mui/material';
import { Business, WorkOutline } from '@mui/icons-material';
import api from '../../../services/api';

const DepartmentsManager: React.FC = () => {
    const theme = useTheme();
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [deptRes, posRes] = await Promise.all([
                    api.get('/departments'),
                    api.get('/positions')
                ]);
                setDepartments(deptRes.data);
                setPositions(posRes.data);
            } catch (error) {
                console.error("Failed to load departments data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

    return (
        <Grid container spacing={3} sx={{ height: '100%' }}>
            {/* Departments List */}
            <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                            <Business color="primary" />
                            Departments
                        </Typography>
                    </Box>
                    <List sx={{ overflowY: 'auto', maxHeight: 600 }}>
                        {departments.length === 0 ? (
                            <Typography sx={{ p: 2, color: 'text.secondary' }}>No departments found.</Typography>
                        ) : (
                            departments.map((dept) => (
                                <React.Fragment key={dept.id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={dept.name}
                                            secondary={dept.description}
                                            primaryTypographyProps={{ fontWeight: 'medium' }}
                                        />
                                    </ListItem>
                                    <Divider component="li" />
                                </React.Fragment>
                            ))
                        )}
                    </List>
                </Paper>
            </Grid>

            {/* Positions List */}
            <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                            <WorkOutline color="secondary" />
                            Positions
                        </Typography>
                    </Box>
                    <List sx={{ overflowY: 'auto', maxHeight: 600 }}>
                        {positions.length === 0 ? (
                            <Typography sx={{ p: 2, color: 'text.secondary' }}>No positions found.</Typography>
                        ) : (
                            positions.map((pos) => (
                                <React.Fragment key={pos.id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={pos.title}
                                            secondary={`Department ID: ${pos.department_id}`} // Could be mapped if needed
                                        />
                                    </ListItem>
                                    <Divider component="li" />
                                </React.Fragment>
                            ))
                        )}
                    </List>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default DepartmentsManager;
