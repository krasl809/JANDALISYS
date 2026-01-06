import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Box, Button, Chip, TextField, Card, CardContent, InputAdornment, 
  CircularProgress, useTheme, alpha, IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { PriceCheck, MonetizationOn, Search, FilterList, ArrowForward } from '@mui/icons-material';
import { ContractPricingReview } from '../../types/contracts';

const ContractReview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { palette, boxShadows }: any = theme;

  const [contracts, setContracts] = useState<ContractPricingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await api.get('contracts/pending-pricing');
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
    const s = (status || '').toLowerCase();
    let config;
    
    switch (s) {
      case 'pending':
        config = { color: palette.warning.main, bg: alpha(palette.warning.main, 0.1), label: t('contracts.status_pending_action') };
        break;
      case 'in_review':
        config = { color: palette.info.main, bg: alpha(palette.info.main, 0.1), label: t('contracts.status_in_review') };
        break;
      case 'approved':
      case 'completed':
        config = { color: palette.success.main, bg: alpha(palette.success.main, 0.1), label: t('contracts.status_completed') };
        break;
      default:
        config = { color: palette.text.secondary, bg: alpha(palette.text.secondary, 0.1), label: status };
    }

    return (
      <Chip 
        label={config.label} 
        size="small" 
        sx={{ 
            bgcolor: config.bg, 
            color: config.color, 
            fontWeight: 700, 
            borderRadius: '6px',
            border: '1px solid transparent',
            fontSize: '0.65rem',
            height: 20
        }} 
      />
    );
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress sx={{ color: palette.primary.main }} />
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box 
            sx={{ 
              p: 1.5, 
              background: palette.gradients.primary.main, 
              borderRadius: '12px', 
              color: '#fff',
              boxShadow: boxShadows.colored.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <PriceCheck fontSize="large" />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="700" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
                {t('contracts.contract_pricing_review')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {t('contracts.pricing_review_desc')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
           <Card 
             sx={{ 
               p: 0, 
               borderRadius: '16px', 
               boxShadow: boxShadows.md,
               overflow: 'hidden',
               border: 'none',
               position: 'relative'
             }}
           >
             <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '4px', 
                  height: '100%', 
                  background: palette.gradients.warning.main 
                }} 
              />
             <CardContent sx={{ p: 3 }}>
               <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                 <Box>
                   <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                     {t('contracts.pending_pricing')}
                   </Typography>
                   <Typography variant="h3" fontWeight="700" sx={{ mt: 1, color: palette.text.primary }}>
                     {contracts.filter(c => c.pricing_status === 'pending').length}
                   </Typography>
                 </Box>
                 <Box 
                    sx={{ 
                      p: 1.5, 
                      borderRadius: '10px', 
                      bgcolor: alpha(palette.warning.main, 0.1), 
                      color: palette.warning.main 
                    }}
                  >
                   <MonetizationOn />
                 </Box>
               </Stack>
             </CardContent>
           </Card>
        </Grid>
      </Grid>

      {/* Table Section */}
      <Card 
        sx={{ 
          borderRadius: '16px', 
          boxShadow: boxShadows.lg,
          border: 'none',
          p: 0,
          overflow: 'hidden'
        }}
      >
        {/* Filter Bar */}
        <Box 
          sx={{ 
            p: 2.5, 
            borderBottom: `1px solid ${palette.divider}`, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 2,
            bgcolor: palette.mode === 'light' ? alpha('#F8FAFC', 0.5) : alpha(palette.background.default, 0.5)
          }}
        >
           <TextField 
             size="small" 
             placeholder={t('contracts.search_placeholder')} 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             InputProps={{ 
                 startAdornment: <InputAdornment position="start"><Search fontSize="small" color="disabled" /></InputAdornment>,
                 sx: { 
                   borderRadius: '8px',
                   bgcolor: palette.background.paper,
                   '& fieldset': { borderColor: `${palette.divider} !important` }
                 } 
             }}
             sx={{ width: { xs: '100%', sm: 350 } }}
           />
           <Button 
             variant="outlined"
             startIcon={<FilterList />} 
             sx={{ 
               borderRadius: '8px', 
               borderColor: palette.divider, 
               color: 'text.secondary',
               textTransform: 'none',
               px: 2,
               '&:hover': { borderColor: palette.primary.main, bgcolor: alpha(palette.primary.main, 0.05) }
             }}
           >
             {t('common.filters')}
           </Button>
        </Box>
        
        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('contracts.contract_no')}</TableCell>
                <TableCell sx={{ py: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('contracts.buyer')}</TableCell>
                <TableCell sx={{ py: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('contracts.destination')}</TableCell>
                <TableCell sx={{ py: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('contracts.status')}</TableCell>
                <TableCell sx={{ py: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('contracts.est_value')}</TableCell>
                <TableCell align="right" sx={{ py: 2, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <TableRow 
                    key={contract.id} 
                    hover 
                    sx={{ 
                      '&:hover': { bgcolor: alpha(palette.primary.main, 0.02) }, 
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => navigate(`/pricing?contract_id=${contract.id}`)}
                  >
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" fontWeight="700" color="primary.main">
                        {contract.contract_no}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" fontWeight="600" color="text.primary">
                        {contract.buyer_name || t('common.na')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {contract.destination}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      {getStatusChip(contract.pricing_status)}
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      {contract.financial_value ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight="700" color="text.primary">
                            {contract.financial_value.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" fontWeight="600" color="text.secondary">
                            {contract.currency}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: palette.text.secondary, fontStyle: 'italic' }}>
                          {t('contracts.not_set')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 2 }}>
                      {contract.pricing_status === 'pending' ? (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<MonetizationOn />}
                          onClick={(e) => { e.stopPropagation(); navigate(`/pricing?contract_id=${contract.id}`); }}
                          sx={{ 
                            borderRadius: '8px',
                            boxShadow: 'none',
                            fontWeight: 700,
                            textTransform: 'none',
                            bgcolor: palette.gradients.primary.main,
                            '&:hover': { 
                              bgcolor: palette.gradients.primary.state, 
                              boxShadow: boxShadows.sm 
                            }
                          }}
                        >
                          {t('contracts.price_now')}
                        </Button>
                      ) : (
                        <IconButton 
                          size="small" 
                          sx={{ 
                            color: palette.primary.main,
                            bgcolor: alpha(palette.primary.main, 0.05),
                            '&:hover': { bgcolor: alpha(palette.primary.main, 0.1) }
                          }}
                          onClick={(e) => { e.stopPropagation(); /* view details */ }}
                        >
                            <ArrowForward fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                   <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Box sx={{ textAlign: 'center', opacity: 0.5 }}>
                        <PriceCheck sx={{ fontSize: 64, mb: 2, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          {t('contracts.no_contracts_found')}
                        </Typography>
                        <Button 
                          variant="text" 
                          onClick={() => setSearchTerm('')}
                          sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                        >
                          {t('common.clear_search')}
                        </Button>
                      </Box>
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