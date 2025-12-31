// src/components/inventory/StockList.tsx

import React, { useEffect, useState } from 'react';
import { 
  Container, Paper, Typography, Box, Table, TableHead, TableRow, 
  TableCell, TableBody, Chip, TextField, InputAdornment, MenuItem 
} from '@mui/material';
import { Inventory, Search, FilterList } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

const StockList = () => {
  const { t } = useTranslation();
  const [stockData, setStockData] = useState([
    // Mock Data - سيتم استبدالها بالـ API
    { id: 1, article: 'White Sugar', warehouse: 'Main Warehouse', qty: 5000, unit: 'MT', reserved: 500, value: 250000 },
    { id: 2, article: 'Brazilian Raw Sugar', warehouse: 'Lattakia Port', qty: 12000, unit: 'MT', reserved: 0, value: 480000 },
    { id: 3, article: 'Soybean Meal', warehouse: 'Aleppo Branch', qty: 200, unit: 'MT', reserved: 20, value: 10000 },
    { id: 4, article: 'Sunflower Oil', warehouse: 'Main Warehouse', qty: 50, unit: 'MT', reserved: 50, value: 45000 }, // Low stock example
  ]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={1}>
            <Inventory color="primary" fontSize="large" />
            <Box>
                <Typography variant="h5" fontWeight="bold">{t('Stock Levels')}</Typography>
                <Typography variant="body2" color="textSecondary">{t('Real-time quantity and valuation across all locations')}</Typography>
            </Box>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', mb: 3, p: 2 }}>
          <Box display="flex" gap={2}>
              <TextField 
                size="small" 
                placeholder={t('Search articles...')}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
                sx={{ width: 300 }}
              />
              <TextField select size="small" label={t('Warehouse')} sx={{ width: 200 }} defaultValue="all">
                  <MenuItem value="all">{t('All Warehouses')}</MenuItem>
                  <MenuItem value="main">{t('Main Warehouse')}</MenuItem>
                  <MenuItem value="aleppo">{t('Aleppo Branch')}</MenuItem>
              </TextField>
          </Box>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell><strong>{t('Article / Commodity')}</strong></TableCell>
              <TableCell><strong>{t('Location')}</strong></TableCell>
              <TableCell align="right"><strong>{t('On Hand')}</strong></TableCell>
              <TableCell align="right"><strong>{t('Reserved')}</strong></TableCell>
              <TableCell align="right"><strong>{t('Available')}</strong></TableCell>
              <TableCell align="right"><strong>{t('Est. Value ($)')}</strong></TableCell>
              <TableCell align="center"><strong>{t('Status')}</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stockData.map((row) => {
                const available = row.qty - row.reserved;
                const status = available < 100 ? 'Low Stock' : (available > 10000 ? 'Overstocked' : 'Normal');
                const statusColor = available < 100 ? 'error' : (available > 10000 ? 'info' : 'success');

                return (
                <TableRow key={row.id} hover>
                    <TableCell>
                        <Typography fontWeight="600">{t(row.article)}</Typography>
                        <Typography variant="caption" color="textSecondary">{t('Unit')}: {t(row.unit)}</Typography>
                    </TableCell>
                    <TableCell>{t(row.warehouse)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.qty.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.reserved.toLocaleString()}</TableCell>
                    <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{available.toLocaleString()}</TableCell>
                    <TableCell align="right">${row.value.toLocaleString()}</TableCell>
                    <TableCell align="center">
                        <Chip label={t(status)} color={statusColor} size="small" variant="outlined" />
                    </TableCell>
                </TableRow>
                );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default StockList;