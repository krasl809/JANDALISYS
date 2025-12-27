// src/components/inventory/DeliveryNoteList.tsx

import React, { useEffect, useState } from 'react';
import { 
  Container, Paper, Typography, Box, Button, Tabs, Tab, 
  Table, TableHead, TableRow, TableCell, TableBody, Chip, 
  IconButton, Tooltip 
} from '@mui/material';
import { Add, LocalShipping, Visibility, Print } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const DeliveryNoteList = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  
  // Mock Data
  const movements = [
    { id: 1, ref: 'DN-IN-2024-001', type: 'inbound', date: '2024-11-20', from: 'Cargill Intl', to: 'Main Warehouse', status: 'approved', items: 'Wheat (500MT)' },
    { id: 2, ref: 'DN-OUT-2024-055', type: 'outbound', date: '2024-11-21', from: 'Aleppo Branch', to: 'Almarai Co.', status: 'draft', items: 'Sugar (50MT)' },
    { id: 3, ref: 'DN-TRF-2024-012', type: 'transfer', date: '2024-11-22', from: 'Main Warehouse', to: 'Aleppo Branch', status: 'pending', items: 'Corn (100MT)' },
  ];

  const getStatusChip = (status: string) => {
      const colors: any = { approved: 'success', pending: 'warning', draft: 'default', rejected: 'error' };
      return <Chip label={status.toUpperCase()} color={colors[status]} size="small" sx={{ fontWeight: 'bold', borderRadius: 1 }} />;
  };

  const getTypeChip = (type: string) => {
      const icons: any = { inbound: '📥', outbound: '📤', transfer: '🔄' };
      return <Chip icon={<span>{icons[type]}</span>} label={type.toUpperCase()} variant="outlined" size="small" />;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h5" fontWeight="bold">Delivery Notes</Typography>
            <Typography variant="body2" color="textSecondary">Manage Inbound, Outbound, and Internal Transfers</Typography>
        </Box>
        <Button 
            variant="contained" 
            startIcon={<Add />} 
            sx={{ bgcolor: '#0F172A' }}
            onClick={() => navigate('/inventory/movements/new')}
        >
            New Movement
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)} 
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#F8FAFC' }}
        >
            <Tab label="All Movements" />
            <Tab label="Inbound" />
            <Tab label="Outbound" />
            <Tab label="Transfers" />
        </Tabs>
        
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell><strong>Reference</strong></TableCell>
                    <TableCell><strong>Type</strong></TableCell>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Route (From → To)</strong></TableCell>
                    <TableCell><strong>Items Summary</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {movements.map((row) => (
                    <TableRow key={row.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                            {row.ref}
                        </TableCell>
                        <TableCell>{getTypeChip(row.type)}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>
                            <Typography variant="body2" fontWeight="600">{row.from}</Typography>
                            <Typography variant="caption" color="textSecondary">↓ to</Typography>
                            <Typography variant="body2" fontWeight="600">{row.to}</Typography>
                        </TableCell>
                        <TableCell>{row.items}</TableCell>
                        <TableCell>{getStatusChip(row.status)}</TableCell>
                        <TableCell align="right">
                            <Tooltip title="View Details"><IconButton size="small"><Visibility /></IconButton></Tooltip>
                            <Tooltip title="Print Note"><IconButton size="small"><Print /></IconButton></Tooltip>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default DeliveryNoteList;