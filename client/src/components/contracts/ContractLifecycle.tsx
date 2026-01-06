import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Container, Typography, Grid, Card, Divider, Chip, 
  Stepper, Step, StepLabel, StepConnector, Button, IconButton, Stack,
  CircularProgress, Alert, Table, TableHead, TableBody, TableRow, TableCell
} from '@mui/material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { 
  Description, LocalShipping, AccountBalance, ArrowBack, 
  Warning, Edit, ReceiptLong, History
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { stepConnectorClasses } from '@mui/material/StepConnector';
import api from '../../services/api';
import { Contract, FinancialTransaction } from '../../types/contracts';
import SectionHeader from '../common/SectionHeader';

const ColorlibConnector = styled(StepConnector)(({ theme }) => {
  const { palette } = theme as any;
  return {
    [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
    [`&.${stepConnectorClasses.active}`]: {
      [`& .${stepConnectorClasses.line}`]: { backgroundImage: palette.gradients?.primary?.main || 'linear-gradient( 95deg,rgb(56, 189, 248) 0%,rgb(74, 222, 128) 50%,rgb(34, 197, 94) 100%)' },
    },
    [`&.${stepConnectorClasses.completed}`]: {
      [`& .${stepConnectorClasses.line}`]: { backgroundImage: palette.gradients?.success?.main || 'linear-gradient( 95deg,rgb(56, 189, 248) 0%,rgb(74, 222, 128) 50%,rgb(34, 197, 94) 100%)' },
    },
    [`& .${stepConnectorClasses.line}`]: { height: 3, border: 0, backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0', borderRadius: 1 },
  };
});

const ColorlibStepIconRoot = styled('div')<{ ownerState: { completed?: boolean; active?: boolean } }>(({ theme, ownerState }) => {
  const { palette, boxShadows } = theme as any;
  return {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#ccc',
    zIndex: 1, color: '#fff', width: 48, height: 48, display: 'flex', borderRadius: '12px', justifyContent: 'center', alignItems: 'center',
    boxShadow: boxShadows.sm,
    ...(ownerState.active && { 
      backgroundImage: palette.gradients?.primary?.main || 'linear-gradient( 136deg, rgb(56, 189, 248) 0%, rgb(37, 99, 235) 100%)', 
      boxShadow: boxShadows.primary 
    }),
    ...(ownerState.completed && { 
      backgroundImage: palette.gradients?.success?.main || 'linear-gradient( 136deg, rgb(74, 222, 128) 0%, rgb(34, 197, 94) 100%)',
      boxShadow: boxShadows.success
    }),
  };
});

interface ColorlibStepIconProps {
  active?: boolean;
  completed?: boolean;
  icon: React.ReactNode;
}

function ColorlibStepIcon(props: ColorlibStepIconProps) {
  const icons: { [index: string]: React.ReactElement } = { 
    1: <Description />, 
    2: <LocalShipping />, 
    3: <AccountBalance /> 
  };
  
  return (
    <ColorlibStepIconRoot ownerState={{ completed: props.completed, active: props.active }}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

const ContractLifecycle = () => {
  const theme = useTheme();
  const { palette, boxShadows } = theme as any;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ledger, setLedger] = useState<FinancialTransaction[]>([]);

  const steps = [
    t('contracts.steps.signed'),
    t('contracts.steps.shipping'),
    t('contracts.steps.clearance')
  ];

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed': return { main: palette.success.main, bg: alpha(palette.success.main, 0.1) };
      case 'cancelled': return { main: palette.error.main, bg: alpha(palette.error.main, 0.1) };
      case 'active':
      case 'posted': return { main: palette.info.main, bg: alpha(palette.info.main, 0.1) };
      case 'draft':
      case 'pending': return { main: palette.warning.main, bg: alpha(palette.warning.main, 0.1) };
      default: return { main: palette.primary.main, bg: alpha(palette.primary.main, 0.1) };
    }
  };

  const currentStep = getStep(contract.status);

  return (
    <Container maxWidth={false} sx={{ mt: 4, pb: 4 }}>
      <Box display="flex" alignItems="center" mb={4} gap={2}>
        <IconButton onClick={() => navigate(-1)} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box>
            <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4" fontWeight="800" color="primary.main">
                  {contract.contract_no || t('contracts.draft_contract')}
                </Typography>
                <Chip 
                  label={t(`contracts.status.${contract.status.toLowerCase()}`).toUpperCase()} 
                  color={getStatusColor(contract.status) as any} 
                  sx={{ fontWeight: 'bold', borderRadius: 1.5 }} 
                />
            </Box>
            <Typography variant="body1" color="text.secondary">
              {contract.direction === 'import' ? t('contracts.import_operation') : t('contracts.export_operation')} — 
              {contract.items?.[0]?.article_name || t('contracts.generic_commodity')}
            </Typography>
        </Box>
        <Box flexGrow={1} />
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            startIcon={<Edit />} 
            onClick={() => navigate(`/contracts/${id}/edit`)}
            sx={{ borderRadius: 2 }}
          >
            {t('contracts.edit_contract')}
          </Button>
        </Stack>
      </Box>

      <Card elevation={0} sx={{ 
        mb: 4, py: 5, borderRadius: 4, 
        border: `1px solid ${contract.status === 'cancelled' ? theme.palette.error.light : theme.palette.divider}`,
        bgcolor: contract.status === 'cancelled' ? alpha(theme.palette.error.main, 0.02) : 'transparent'
      }}>
        {contract.status === 'cancelled' ? (
          <Box textAlign="center">
            <Warning color="error" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" color="error.main" fontWeight="700">{t('contracts.messages.cancelled')}</Typography>
          </Box>
        ) : (
          <Stepper alternativeLabel activeStep={currentStep} connector={<ColorlibConnector />}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
            <Card elevation={0} sx={{ height: '100%', borderRadius: 4, p: 3, border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeader title={t('contracts.financial_summary')} icon={<AccountBalance fontSize="small" />} />
                <Box display="flex" justifyContent="space-around" textAlign="center" py={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>{t('contracts.average_price')}</Typography>
                      <Typography variant="h5" fontWeight="800" sx={{ mt: 1 }}>
                        {avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} <Typography component="span" variant="body2" color="text.secondary">/ MT</Typography>
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>{t('contracts.total_value')}</Typography>
                      <Typography variant="h5" fontWeight="800" color="primary.main" sx={{ mt: 1 }}>
                        {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase' }}>{t('contracts.currency')}</Typography>
                      <Typography variant="h5" fontWeight="800" color="success.main" sx={{ mt: 1 }}>
                        {contract.contract_currency || 'USD'}
                      </Typography>
                    </Box>
                </Box>
            </Card>
        </Grid>
        <Grid item xs={12} md={4}>
            <Card elevation={0} sx={{ borderRadius: 4, p: 3, border: `1px solid ${theme.palette.divider}` }}>
                <SectionHeader title={t('contracts.key_milestones')} icon={<Description fontSize="small" />} />
                <Stack spacing={2.5} sx={{ mt: 2 }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">{t('contracts.issue_date')}</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.issue_date || '—'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">{t('contracts.shipment_date')}</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.shipment_date || '—'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">{t('contracts.payment_terms')}</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.payment_terms || '—'}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary" fontWeight="600">{t('contracts.destination')}</Typography>
                      <Typography variant="body2" fontWeight="700">{contract.destination || '—'}</Typography>
                    </Box>
                </Stack>
            </Card>
        </Grid>
      </Grid>

      {/* 4. Financial Ledger Section */}
      <Card elevation={0} sx={{ mt: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 3 }}>
          <SectionHeader title={t('contracts.ledger.title')} icon={<History fontSize="small" />} />
          {ledger.length === 0 ? (
            <Box textAlign="center" py={6}>
              <ReceiptLong sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">{t('contracts.ledger.no_transactions')}</Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2, overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{t('contracts.ledger.date')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{t('contracts.ledger.description')}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{t('contracts.ledger.reference')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{t('contracts.ledger.debit')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{t('contracts.ledger.credit')}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.04) }}>{t('contracts.ledger.balance')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledger.map((tx) => (
                    <TableRow key={tx.id} hover>
                      <TableCell>{tx.transaction_date}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">{tx.description}</Typography>
                        <Typography variant="caption" color="text.secondary">{tx.type}</Typography>
                      </TableCell>
                      <TableCell>{tx.reference || '—'}</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {tx.debit ? tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {tx.credit ? tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        {tx.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    '& td': { borderTop: `2px solid ${theme.palette.primary.main}` }
                  }}>
                    <TableCell colSpan={3} sx={{ fontWeight: 'bold', textAlign: 'right', py: 2, fontSize: '0.85rem' }}>
                      {t('contracts.ledger.summary_totals')} ({contract.contract_currency})
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: '800', color: 'error.main', fontSize: '0.9rem' }}>
                      {ledger.reduce((sum, tx) => sum + (tx.debit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: '800', color: 'success.main', fontSize: '0.9rem' }}>
                      {ledger.reduce((sum, tx) => sum + (tx.credit || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="right" sx={{ 
                      fontWeight: '900', 
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.dark,
                      fontSize: '1rem'
                    }}>
                      {ledger.length > 0 ? (ledger[ledger.length - 1].balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Card>
    </Container>
  );
};

export default ContractLifecycle;