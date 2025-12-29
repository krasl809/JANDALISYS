import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Box, Button, Chip, TextField, Card, CardContent, InputAdornment, 
  CircularProgress, useTheme, alpha, IconButton, Stack
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { PriceCheck, Visibility, Send, MonetizationOn, Search, FilterList, ArrowForward } from '@mui/icons-material';
import { ContractPricingReview } from '../../types/contracts';

const ContractReview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme(); // 👈 Hook for dynamic theming

  const [contracts, setContracts] = useState<ContractPricingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await api.get('/contracts/pending-pricing');
      // Sort: Pending first, then by date
      const sorted = response.data.sort((a: ContractPricingReview, b: ContractPricingReview) => {
        if (a.pricing_status === 'pending' && b.pricing_status !== 'pending') return -1;
        return new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime();
      });
      setContracts(sorted);
    } catch (err) {
      console.error('Error fetching pricing contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(c => 
    c.contract_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper for soft colored chips
  const getStatusChip = (status: string) => {
    const config = {
      pending: { color: theme.palette.warning.main, bg: alpha(theme.palette.warning.main, 0.1), label: 'Pending Action' },
      in_review: { color: theme.palette.info.main, bg: alpha(theme.palette.info.main, 0.1), label: 'In Review' },
      approved: { color: theme.palette.success.main, bg: alpha(theme.palette.success.main, 0.1), label: 'Completed' },
    }[status] || { color: theme.palette.text.secondary, bg: alpha(theme.palette.text.secondary, 0.1), label: status };

    return (
      <Chip 
        label={config.label} 
        size="small" 
        sx={{ 
            bgcolor: config.bg, 
            color: config.color, 
            fontWeight: 700, 
            borderRadius: '6px',
            border: '1px solid transparent' 
        }} 
      />
    );
  };

  // Header Style
  const tableHeadSx = {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : '#F8FAFC',
    color: theme.palette.text.secondary,
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '12px 16px',
  };

  const tableCellSx = {
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '12px 16px',
    color: theme.palette.text.primary,
  };

  if (loading) return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, color: 'primary.main' }}>
            <PriceCheck fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="800" color="text.primary">
                {t('contractPricingReview')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                Review pending contracts and assign final financial values.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
           <Card sx={{ borderLeft: `4px solid ${theme.palette.primary.main}`, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
             <CardContent>
               <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Pending Pricing</Typography>
               <Typography variant="h4" fontWeight="800" sx={{ mt: 1, color: 'text.primary' }}>
                 {contracts.filter(c => c.pricing_status === 'pending').length}
               </Typography>
             </CardContent>
           </Card>
        </Grid>
      </Grid>

      {/* Table Section */}
      <Card sx={{ border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
        
        {/* Filter Bar */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
           <TextField 
             size="small" 
             placeholder="Search Contract No, Buyer..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             InputProps={{ 
                 startAdornment: <InputAdornment position="start"><Search fontSize="small" color="action" /></InputAdornment>,
                 sx: { bgcolor: theme.palette.background.default } 
             }}
             sx={{ width: { xs: '100%', sm: 300 } }}
           />
           <Button startIcon={<FilterList />} color="inherit">Filter</Button>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeadSx}>{t('contractNo')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('buyer')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('destination')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('status')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('estValue')}</TableCell>
                <TableCell sx={{...tableHeadSx, textAlign: 'right'}}>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <TableRow 
                    key={contract.id} 
                    hover 
                    sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }, cursor: 'pointer' }}
                    onClick={() => navigate(`/pricing?contract_id=${contract.id}`)}
                  >
                    <TableCell sx={{ ...tableCellSx, fontWeight: 'bold', color: theme.palette.primary.main }}>
                      {contract.contract_no}
                    </TableCell>
                    <TableCell sx={tableCellSx}>{contract.buyer_name || 'N/A'}</TableCell>
                    <TableCell sx={tableCellSx}>{contract.destination}</TableCell>
                    <TableCell sx={tableCellSx}>{getStatusChip(contract.pricing_status)}</TableCell>
                    <TableCell sx={{...tableCellSx, fontWeight: '600', color: theme.palette.text.primary}}>
                      {contract.financial_value 
                        ? `${contract.currency} ${contract.financial_value.toLocaleString()}` 
                        : <Typography variant="caption" color="text.secondary">Not Set</Typography>}
                    </TableCell>
                    <TableCell sx={{ ...tableCellSx, textAlign: 'right' }}>
                      {contract.pricing_status === 'pending' ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<MonetizationOn />}
                          onClick={(e) => { e.stopPropagation(); navigate(`/pricing?contract_id=${contract.id}`); }}
                          sx={{ 
                            boxShadow: 'none', fontWeight: 600,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2), boxShadow: 'none' }
                          }}
                        >
                          {t('priceNow')}
                        </Button>
                      ) : (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); /* view details */ }}>
                            <ArrowForward fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                   <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary" variant="body1">No contracts found.</Typography>
                      <Button variant="text" onClick={() => setSearchTerm('')}>Clear Search</Button>
                   </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

    </Container>
  );
};

export default ContractReview;