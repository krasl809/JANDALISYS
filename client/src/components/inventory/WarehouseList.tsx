import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip } from '@mui/material';
import { Add, Warehouse } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const WarehouseList = () => {
  const { t } = useTranslation();
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    // api.get('/inventory/warehouses').then(res => setWarehouses(res.data));
    // بيانات وهمية للتجربة حالياً
    setWarehouses([
        { id: 1, name: 'Main Warehouse', location: 'Damascus', is_active: true },
        { id: 2, name: 'Aleppo Branch', location: 'Aleppo', is_active: true }
    ] as any);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
            <Warehouse color="primary" />
            <Typography variant="h5" fontWeight="bold">{t("Warehouses Management")}</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}>{t("New Warehouse")}</Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell><strong>{t("Name")}</strong></TableCell>
              <TableCell><strong>{t("Location")}</strong></TableCell>
              <TableCell><strong>{t("Status")}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses.map((row: any) => (
              <TableRow key={row.id} hover>
                <TableCell>{t(row.name)}</TableCell>
                <TableCell>{t(row.location)}</TableCell>
                <TableCell><Chip label={row.is_active ? t("Active") : t("Inactive")} color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default WarehouseList;