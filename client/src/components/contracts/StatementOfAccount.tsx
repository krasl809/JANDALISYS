import React from 'react';
import { 
  Card, CardContent, Box, Typography, Stack, Divider, 
  Table, TableHead, TableRow, TableCell, TableBody, 
  Button, alpha 
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { 
  AccountBalanceWallet, ReceiptLong, Print 
} from '@mui/icons-material';

import { FinancialTransaction } from '../../types/contracts';

interface StatementOfAccountProps {
  mode: 'export' | 'import';
  formData: any;
  totalAmount: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  filteredLedger: FinancialTransaction[];
  ledger: FinancialTransaction[];
  isFixedPrice: boolean;
  t: any;
  theme: any;
  palette: any;
  boxShadows: any;
}

const StatementOfAccount: React.FC<StatementOfAccountProps> = React.memo(({
  mode, formData, totalAmount, totalDebit, totalCredit, netBalance,
  filteredLedger, ledger, isFixedPrice, t, theme, palette, boxShadows
}) => {
  return (
    <Grid2 container spacing={3}>
      {/* Professional SOA Summary */}
      <Grid2 size={{ xs: 12 }}>
        <Card elevation={0} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Box p={1.5} borderRadius={2} bgcolor={alpha(theme.palette.primary.main, 0.1)} color="primary.main">
                <AccountBalanceWallet fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="800" color="text.primary">
                  {t("Statement of Account")} - {mode === 'import' ? t('Import Contract') : t('Export Contract')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {mode === 'import'
                    ? t('Buyer Perspective: Amounts owed to seller and payments made')
                    : t('Seller Perspective: Amounts owed from buyer and payments received')}
                </Typography>
              </Box>
            </Box>

            <Grid2 container spacing={4}>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {mode === 'import' ? t("Total Purchases") : t("Total Sales")}
                </Typography>
                <Typography variant="h4" fontWeight="800" color="primary.main" sx={{ mt: 1 }}>
                  {totalAmount.toLocaleString()} <Typography variant="caption" component="span">{formData.contract_currency}</Typography>
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {mode === 'import' ? t("Total Paid") : t("Total Received")}
                </Typography>
                <Typography variant="h4" fontWeight="800" color="success.main" sx={{ mt: 1 }}>
                  {totalCredit.toLocaleString()} <Typography variant="caption" component="span">{formData.contract_currency}</Typography>
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {t("Net Balance")}
                </Typography>
                <Typography variant="h4" fontWeight="800" color={netBalance > 0 ? "error.main" : "success.main"} sx={{ mt: 1 }}>
                  {netBalance.toLocaleString()} <Typography variant="caption" component="span">{formData.contract_currency}</Typography>
                </Typography>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>
      </Grid2>

      {/* Transactions Table */}
      <Grid2 size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: `1px solid ${palette.divider}`, borderRadius: '12px', overflow: 'hidden', boxShadow: boxShadows.md }}>
          <Box sx={{ p: 2.5, bgcolor: alpha(palette.primary.main, 0.03), borderBottom: `1px solid ${palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box p={0.8} borderRadius={1.5} bgcolor={alpha(palette.primary.main, 0.1)} color="primary.main">
                <ReceiptLong fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="700" color="text.primary">{t("Detailed Transaction Ledger")}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {mode === 'import' ? t('Buyer Accounting: Debits = amounts owed, Credits = payments made') : t('Seller Accounting: Debits = amounts receivable, Credits = payments received')}
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<Print />} sx={{ borderColor: theme.palette.divider, color: 'text.secondary' }}>
                {t("Export PDF")}
              </Button>
            </Stack>
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 100 }}>{t("Date")}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 120 }}>{t("Reference")}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 100 }}>{t("Type")}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("Description")}</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 120 }}>
                    {t("Amount")}
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', mt: 0.5 }}>
                      {mode === 'import' ? t("(- Debit / + Credit)") : t("(+ Debit / - Credit)")}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 120, borderLeft: `2px solid ${theme.palette.divider}` }}>
                    {t("Running Balance")}
                    <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', mt: 0.5 }}>
                      {mode === 'import' ? t('Amount Still Owed') : t('Amount Receivable')}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((row: FinancialTransaction, index: number) => (
                    <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                      <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary', fontSize: '0.85rem', py: 1.5 }}>
                        {new Date(row.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                        {row.reference || '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                          {row.type === 'Invoice' ? `⚡ ${t('Invoice')}` : `💸 ${t('Payment')}`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', maxWidth: 200 }}>
                        <Box sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <Typography variant="body2" component="span">
                            {row.description || (row.type === 'Invoice' ? t('Initial invoice for contract value') : t('Payment'))}
                          </Typography>
                          {row.linked_transaction_id && (
                            <Typography variant="caption" display="block" color="primary.main">
                              {t("Linked to")}: {ledger.find((l: FinancialTransaction) => l.id === row.linked_transaction_id)?.reference || t('Invoice')}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 700,
                        color: row.debit! > 0 ? 'error.main' : row.credit! > 0 ? 'success.main' : 'text.secondary',
                        fontSize: '0.9rem',
                        fontFamily: 'monospace'
                      }}>
                        {row.debit! > 0 
                          ? `${mode === 'import' ? '-' : '+'}${formData.contract_currency} ${row.debit!.toLocaleString()}` 
                          : row.credit! > 0 
                            ? `${mode === 'import' ? '+' : '-'}${formData.contract_currency} ${row.credit!.toLocaleString()}` 
                            : '-'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        fontFamily: 'monospace',
                        borderLeft: `2px solid ${alpha(theme.palette.divider, 0.3)}`,
                        color: row.balance! === 0 ? theme.palette.success.main :
                          (mode === 'import' ? row.balance! < 0 : row.balance! > 0) ? theme.palette.error.main :
                            theme.palette.info.main,
                        bgcolor: index % 2 === 0 ? alpha(theme.palette.background.default, 0.3) : 'transparent'
                      }}>
                        {formData.contract_currency} {row.balance!.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Box textAlign="center">
                        <AccountBalanceWallet sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                        <Typography color="text.secondary" variant="h6" gutterBottom>
                          {t("No Financial Transactions Yet")}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {t("Transactions will appear here once invoices are created and payments are recorded.")}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Card>
      </Grid2>
    </Grid2>
  );
});

export default StatementOfAccount;
