// src/components/inventory/DeliveryNoteList.tsx

import React, { useEffect, useState } from 'react';
import { 
  Container, Paper, Typography, Box, Button, Tabs, Tab, 
  Table, TableHead, TableRow, TableCell, TableBody, Chip, 
  IconButton, Tooltip 
} from '@mui/material';
import { Add, LocalShipping, Visibility, Print } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const DeliveryNoteList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  
  // Mock Data
  const movements = [
    { id: 1, ref: 'DN-IN-2024-001', type: 'inbound', date: '2024-11-20', from: 'Cargill Intl', to: 'Main Warehouse', status: 'approved', items: 'Wheat (500MT)' },
    { id: 2, ref: 'DN-OUT-2024-055', type: 'outbound', date: '2024-11-21', from: 'Aleppo Branch', to: 'Almarai Co.', status: 'draft', items: 'Sugar (50MT)' },
    { id: 3, ref: 'DN-TRF-2024-012', type: 'transfer', date: '2024-11-22', from: 'Main Warehouse', to: 'Aleppo Branch', status: 'pending', items: 'Corn (100MT)' },
  ];

  const getStatusChip = (status: string) => {
      const colors: any = { approved: 'success', pending: 'warning', draft: 'default', rejected: 'error' };
      return <Chip label={t(status).toUpperCase()} color={colors[status]} size="small" sx={{ fontWeight: 'bold', borderRadius: 1 }} />;
  };

  const getTypeChip = (type: string) => {
      const icons: any = { inbound: '📥', outbound: '📤', transfer: '🔄' };
      return <Chip icon={<span>{icons[type]}</span>} label={t(type).toUpperCase()} variant="outlined" size="small" />;
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
            <Typography variant="h5" fontWeight="bold">{t("Delivery Notes")}</Typography>
            <Typography variant="body2" color="textSecondary">{t("Manage Inbound, Outbound, and Internal Transfers")}</Typography>
        </Box>
        <Button 
            variant="contained" 
            startIcon={<Add />} 
            sx={{ bgcolor: '#0F172A' }}
            onClick={() => navigate('/inventory/movements/new')}
        >
            {t("New Movement")}
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Tabs 
            value={tabValue} 
            onChange={(_, v) => setTabValue(v)} 
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#F8FAFC' }}
        >
            <Tab label={t("All Movements")} />
            <Tab label={t("Inbound")} />
            <Tab label={t("Outbound")} />
            <Tab label={t("Transfers")} />
        </Tabs>
        
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell><strong>{t("Reference")}</strong></TableCell>
                    <TableCell><strong>{t("Type")}</strong></TableCell>
                    <TableCell><strong>{t("Date")}</strong></TableCell>
                    <TableCell><strong>{t("Route (From → To)")}</strong></TableCell>
                    <TableCell><strong>{t("Items Summary")}</strong></TableCell>
                    <TableCell><strong>{t("Status")}</strong></TableCell>
                    <TableCell align="right"><strong>{t("Actions")}</strong></TableCell>
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
                            <Typography variant="body2" fontWeight="600">{t(row.from)}</Typography>
                            <Typography variant="caption" color="textSecondary">↓ {t("to")}</Typography>
                            <Typography variant="body2" fontWeight="600">{t(row.to)}</Typography>
                        </TableCell>
                        <TableCell>{t(row.items)}</TableCell>
                        <TableCell>{getStatusChip(row.status)}</TableCell>
                        <TableCell align="right">
                            <Tooltip title={t("View Details")}><IconButton size="small"><Visibility /></IconButton></Tooltip>
                            <Tooltip title={t("Print Note")}><IconButton size="small"><Print /></IconButton></Tooltip>
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