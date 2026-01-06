import React from 'react';
import { 
  Box, Card, CardContent, Grid, Typography, useTheme, alpha, 
  CircularProgress, InputAdornment, RadioGroup, FormControlLabel, 
  Radio, Tooltip, IconButton, Stack, Button, TextField
} from '@mui/material';
import { 
  Event, EditCalendar, Map, Business, AttachMoney, Description, 
  LocalShipping, Receipt, AddCircleOutline 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import FormField from '../common/FormField';
import DataTable, { Column } from '../common/DataTable';
import SectionHeader from '../common/SectionHeader';
import { ContractDetailsTabProps, Article } from '../../types/contracts';

const ContractDetailsTab: React.FC<ContractDetailsTabProps> = ({
  formData,
  items,
  mode,
  isShipmentDate,
  lists,
  isFixedPrice,
  totalAmount,
  handleInputChange,
  handleItemChange,
  handleAddItem,
  handleRemoveItem,
  setIsShipmentDate,
  handleGenerateNumber,
  isGeneratingNo,
  id,
}) => {
  const theme = useTheme();
  const { palette, boxShadows } = theme as any;
  const { t } = useTranslation();

  const headerSx = {
    backgroundColor: alpha(palette.primary.main, 0.05),
    color: palette.text.primary,
    fontWeight: '700', 
    fontSize: '0.75rem', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${palette.divider}`, 
    padding: '16px',
  };

  const cellSx = {
    borderBottom: `1px solid ${palette.divider}`,
    padding: '12px 16px',
    color: palette.text.primary,
    fontSize: '0.875rem'
  };

  const inputTableSx = {
    '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: palette.divider },
    '& .MuiInputBase-input': {
      fontSize: '0.875rem',
      fontWeight: 500,
      py: 0.5
    }
  };

  const itemColumns: Column[] = [
    {
      key: 'article_id',
      label: t('contracts.article'),
      type: 'autocomplete' as const,
      width: '25%',
      options: lists.articles,
      getOptionLabel: (opt: Article) => opt?.article_name || '',
    },
    ...(mode === 'import' ? [{
      key: 'qty_lot',
      label: t('contracts.qty_lot'),
      type: 'number' as const,
    } as Column] : []),
    {
      key: 'qty_ton',
      label: mode === 'export' ? t('contracts.quantity_mt') : t('contracts.qty_ton'),
      type: 'number' as const,
      endAdornment: <Typography variant="caption">MT</Typography>,
    } as Column,
    {
      key: 'packing',
      label: t('contracts.packing'),
      type: 'text' as const,
    } as Column,
    ...(mode === 'import' && !isFixedPrice ? [{
      key: 'premium',
      label: t('contracts.premium'),
      type: 'number' as const,
    } as Column] : [{
      key: 'price',
      label: t('contracts.price'),
      type: 'number' as const,
    } as Column]),
    ...(isFixedPrice ? [{
      key: 'total',
      label: t('contracts.total'),
      type: 'text' as const,
      align: 'right' as const,
      renderCell: (value: number) => (
        <Typography sx={{ fontWeight: 'bold', color: theme.palette.primary.main }}>
          {value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </Typography>
      ),
    } as Column] : []),
  ];

  return (
    <Grid container spacing={3}>
      {/* LEFT COLUMN */}
      <Grid xs={12} lg={8}>
        {/* 1. General Info */}
        <Card elevation={0} sx={{ mb: 3, borderRadius: '16px', border: `1px solid ${palette.divider}`, boxShadow: boxShadows.md }}>
          <CardContent sx={{ p: 3 }}>
            <SectionHeader title={t('contracts.general_information')} icon={<Description fontSize="small" />} />
            <Grid container spacing={3}>
              <FormField
                label={t('contracts.contract_reference_no')}
                type="text"
                value={formData.contract_no}
                disabled
                gridSize={{ xs: 12, md: 6 }}
                inputProps={{
                  sx: { 
                    bgcolor: alpha(palette.background.default, 0.5),
                    borderRadius: '8px',
                    '&.Mui-disabled': {
                      WebkitTextFillColor: palette.text.primary,
                      fontWeight: 600
                    }
                  },
                  endAdornment: isGeneratingNo && <CircularProgress size={20}/>,
                }}
              />
              {mode === 'import' && (
                <Grid xs={12} md={6}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('contracts.pricing_model')}
                    </Typography>
                  </Box>
                  <RadioGroup
                    row
                    value={formData.contract_type}
                    onChange={(e) => {
                      handleInputChange('contract_type', e.target.value);
                      handleItemChange('all', 'price', '0');
                      handleItemChange('all', 'premium', '0');
                      handleItemChange('all', 'total', 0);
                    }}
                  >
                    <FormControlLabel 
                      value="fixed_price" 
                      control={<Radio size="small" sx={{ color: palette.primary.main, '&.Mui-checked': { color: palette.primary.main } }}/>} 
                      label={<Typography variant="body2" fontWeight="500">{t('contracts.fixed_price')}</Typography>} 
                    />
                    <FormControlLabel 
                      value="stock_market" 
                      control={<Radio size="small" sx={{ color: palette.primary.main, '&.Mui-checked': { color: palette.primary.main } }}/>} 
                      label={<Typography variant="body2" fontWeight="500">{t('contracts.stock_market')}</Typography>} 
                    />
                  </RadioGroup>
                </Grid>
              )}
              <FormField
                label={t('contracts.currency')}
                type="select"
                value={formData.contract_currency}
                onChange={(value: string) => handleInputChange('contract_currency', value)}
                options={['USD', 'EUR', 'SAR', 'GBP'].map(c => ({ value: c, label: c }))}
                gridSize={{ xs: 12, md: 6 }}
              />
              <FormField
                label={t('contracts.issue_date')}
                type="date"
                value={formData.issue_date}
                onChange={(value: string) => handleInputChange('issue_date', value)}
                required
                gridSize={{ xs: 12, md: 6 }}
              />
              <FormField
                label={t('contracts.actual_shipped_quantity')}
                type="number"
                value={formData.actual_shipped_quantity}
                onChange={(value: string) => handleInputChange('actual_shipped_quantity', value)}
                gridSize={{ xs: 12, md: 6 }}
                inputProps={{
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="700" color="primary.main">MT</Typography></InputAdornment>,
                }}
              />
            </Grid>
          </CardContent>
        </Card>

        {/* 2. Product Details Table */}
        <Card elevation={0} sx={{ mb: 3, borderRadius: '16px', border: `1px solid ${palette.divider}`, boxShadow: boxShadows.md, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, borderBottom: `1px solid ${palette.divider}`, bgcolor: alpha(palette.primary.main, 0.02) }}>
            <SectionHeader title={t('contracts.product_specifications')} icon={<Receipt fontSize="small" />} />
          </Box>
          <DataTable
            columns={itemColumns}
            data={items}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
            onChange={handleItemChange}
            keyField="id"
            headerSx={headerSx}
            cellSx={cellSx}
            inputTableSx={inputTableSx}
          />
          <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(palette.primary.main, 0.02), borderTop: `1px solid ${palette.divider}` }}>
            <Button 
              startIcon={<AddCircleOutline />} 
              onClick={handleAddItem} 
              size="small" 
              variant="text"
              sx={{ 
                fontWeight: 700, 
                color: palette.primary.main,
                '&:hover': { bgcolor: alpha(palette.primary.main, 0.08) }
              }}
            >
              {t('contracts.add_line_item')}
            </Button>
            {isFixedPrice && (
              <Box textAlign="right">
                <Typography variant="caption" sx={{ fontWeight: 700, color: palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('contracts.grand_total')} ({formData.contract_currency})
                </Typography>
                <Typography variant="h5" fontWeight="800" color="primary.main">
                  {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </Typography>
              </Box>
            )}
          </Box>
        </Card>

        {/* 3. Charter Party (Import Only) */}
        {mode === 'import' && (
          <Card elevation={0} sx={{ mb: 3, borderRadius: '16px', border: `1px solid ${palette.divider}`, boxShadow: boxShadows.md }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t('contracts.charter_party')} icon={<LocalShipping fontSize="small" />} />
              <Grid container spacing={3}>
                <FormField
                  label={t('contracts.vessel_name')}
                  type="text"
                  value={formData.vessel_name}
                  onChange={(value: string) => handleInputChange('vessel_name', value)}
                  gridSize={{ xs: 12 }}
                  placeholder={t('contracts.enter_vessel_name')}
                />
                <FormField
                  label={t('contracts.demurrage_rate')}
                  type="number"
                  value={formData.demurrage_rate}
                  onChange={(value: string) => handleInputChange('demurrage_rate', value)}
                  gridSize={{ xs: 12, md: 4 }}
                  inputProps={{
                    endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="700" color="primary.main">{formData.contract_currency}/WWD</Typography></InputAdornment>,
                  }}
                />
                <FormField
                  label={t('contracts.discharge_rate')}
                  type="number"
                  value={formData.discharge_rate}
                  onChange={(value: string) => handleInputChange('discharge_rate', value)}
                  gridSize={{ xs: 12, md: 4 }}
                  inputProps={{
                    endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="700" color="primary.main">MT/WWD</Typography></InputAdornment>,
                  }}
                />
                <FormField
                  label={t('contracts.dispatch_rate')}
                  type="select"
                  value={formData.dispatch_rate}
                  onChange={(value: string) => handleInputChange('dispatch_rate', value)}
                  gridSize={{ xs: 12, md: 4 }}
                  inputProps={{
                    endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="700" color="primary.main">{formData.contract_currency}/WWD</Typography></InputAdornment>,
                  }}
                  selectProps={{
                    displayEmpty: true,
                    renderValue: (): React.ReactNode => formData.dispatch_rate || t('common.select_option'),
                  }}
                  options={[
                    { value: "free", label: t('contracts.free') },
                    { value: "half", label: t('contracts.half_demurrage_rate') }
                  ]}
                />
                <FormField
                  label={t('contracts.laycan_date_from')}
                  type="date"
                  value={formData.laycan_date_from}
                  onChange={(value: string) => handleInputChange('laycan_date_from', value)}
                  gridSize={{ xs: 12, md: 6 }}
                />
                <FormField
                  label={t('contracts.laycan_date_to')}
                  type="date"
                  value={formData.laycan_date_to}
                  onChange={(value: string) => handleInputChange('laycan_date_to', value)}
                  gridSize={{ xs: 12, md: 6 }}
                />
              </Grid>
            </CardContent>
          </Card>
        )}
      </Grid>

      {/* RIGHT COLUMN: Parties & Terms */}
      <Grid xs={12} lg={4}>
        <Stack spacing={3}>
          {/* 4. Parties */}
          <Card elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${palette.divider}`, boxShadow: boxShadows.md }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t('contracts.business_parties')} icon={<Business fontSize="small" />} />
              <Stack spacing={2.5}>
                <FormField
                  label={t('contracts.seller')}
                  type="autocomplete"
                  value={formData.seller_id}
                  onChange={(value: string) => {
                    handleInputChange('seller_id', value);
                    handleGenerateNumber(value);
                  }}
                  autocompleteOptions={lists.sellers}
                  getOptionLabel={(opt: any) => opt.contact_name}
                  required
                />
                <FormField
                  label={t('contracts.buyer')}
                  type="autocomplete"
                  value={formData.buyer_id}
                  onChange={(value: string) => handleInputChange('buyer_id', value)}
                  autocompleteOptions={lists.buyers}
                  getOptionLabel={(opt: any) => opt.contact_name}
                  required
                />
                <FormField
                  label={t('contracts.shipper')}
                  type="autocomplete"
                  value={formData.shipper_id}
                  onChange={(value: string) => handleInputChange('shipper_id', value)}
                  autocompleteOptions={lists.shippers}
                  getOptionLabel={(opt: any) => opt.contact_name}
                />
                {mode === 'import' && (
                  <>
                    <FormField
                      label={t('contracts.broker')}
                      type="autocomplete"
                      value={formData.broker_id}
                      onChange={(value: string) => handleInputChange('broker_id', value)}
                      autocompleteOptions={lists.brokers}
                      getOptionLabel={(opt: any) => opt.contact_name}
                    />
                    <FormField
                      label={t('contracts.agent')}
                      type="autocomplete"
                      value={formData.agent_id}
                      onChange={(value: string) => handleInputChange('agent_id', value)}
                      autocompleteOptions={lists.agents}
                      getOptionLabel={(opt: any) => opt.contact_name}
                    />
                    <FormField
                      label={t('contracts.conveyor')}
                      type="autocomplete"
                      value={formData.conveyor_id}
                      onChange={(value: string) => handleInputChange('conveyor_id', value)}
                      autocompleteOptions={lists.conveyors}
                      getOptionLabel={(opt: any) => opt.contact_name}
                    />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* 5. Commercial Terms */}
          <Card elevation={0} sx={{ borderRadius: '16px', border: `1px solid ${palette.divider}`, boxShadow: boxShadows.md }}>
            <CardContent sx={{ p: 3 }}>
              <SectionHeader title={t('contracts.commercial_terms')} icon={<AttachMoney fontSize="small" />} />
              <Grid container spacing={2.5}>
                <FormField
                  label={t('contracts.payment_terms')}
                  type="text"
                  value={formData.payment_terms}
                  onChange={(value: string) => handleInputChange('payment_terms', value)}
                  gridSize={{ xs: 12 }}
                />
                <FormField
                  label={t('contracts.incoterms')}
                  type="text"
                  value={formData.incoterms}
                  onChange={(value: string) => handleInputChange('incoterms', value)}
                  gridSize={{ xs: 12, md: 6 }}
                />
                <Grid xs={12} md={6}>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {mode === 'export' ? t('contracts.shipment_date_required') : (isShipmentDate ? t('contracts.shipment_date_required') : t('contracts.shipment_period_fta_required'))}
                    </Typography>
                  </Box>
                  {mode === 'export' ? (
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      value={formData.shipment_date || ''}
                      onChange={(e) => handleInputChange('shipment_date', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                    />
                  ) : isShipmentDate ? (
                    <TextField
                      type="date"
                      fullWidth
                      size="small"
                      value={formData.shipment_date || ''}
                      onChange={(e) => {
                        handleInputChange('shipment_date', e.target.value);
                        handleInputChange('shipment_period', '');
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={t('contracts.switch_to_fta')}>
                              <IconButton
                                size="small"
                                onClick={() => setIsShipmentDate(false)}
                                sx={{ color: palette.primary.main, '&:hover': { bgcolor: alpha(palette.primary.main, 0.1) } }}
                              >
                                <EditCalendar fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  ) : (
                    <TextField
                      type="text"
                      fullWidth
                      size="small"
                      placeholder={t('contracts.prompt_shipment_placeholder')}
                      value={formData.shipment_period || ''}
                      onChange={(e) => {
                        handleInputChange('shipment_period', e.target.value);
                        handleInputChange('shipment_date', null);
                      }}
                      sx={{ 
                        '& .MuiOutlinedInput-root': {
                          bgcolor: alpha(palette.info.main, 0.03),
                          borderRadius: '8px'
                        } 
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={t('contracts.switch_to_date')}>
                              <IconButton
                                size="small"
                                onClick={() => setIsShipmentDate(true)}
                                sx={{ color: palette.primary.main, '&:hover': { bgcolor: alpha(palette.primary.main, 0.1) } }}
                              >
                                <Event fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                </Grid>
                {mode === 'export' ? (
                  <FormField
                    label={t('contracts.destination')}
                    type="text"
                    value={formData.destination}
                    onChange={(value: string) => handleInputChange('destination', value)}
                    gridSize={{ xs: 12 }}
                  />
                ) : (
                  <Grid xs={12}>
                    <Box sx={{
                      mt: 1.5,
                      p: 2.5,
                      bgcolor: alpha(palette.info.main, 0.05),
                      borderRadius: '12px',
                      border: `1px dashed ${alpha(palette.info.main, 0.3)}`
                    }}>
                      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                        <Box sx={{ 
                          p: 1, 
                          borderRadius: '8px', 
                          bgcolor: alpha(palette.info.main, 0.1), 
                          color: palette.info.main,
                          display: 'flex'
                        }}>
                          <Map fontSize="small" />
                        </Box>
                        <Typography variant="subtitle2" fontWeight="700" color="info.main">
                          {t('contracts.logistics_route')}
                        </Typography>
                      </Box>
                      <Stack spacing={2.5}>
                        <FormField
                          label={t('contracts.loading_port')}
                          type="text"
                          value={formData.port_of_loading}
                          onChange={(value: string) => handleInputChange('port_of_loading', value)}
                        />
                        <FormField
                          label={t('contracts.discharge_port')}
                          type="text"
                          value={formData.destination}
                          onChange={(value: string) => handleInputChange('destination', value)}
                        />
                      </Stack>
                    </Box>
                  </Grid>
                )}
                <FormField
                  label={t('contracts.bank_details')}
                  type="text"
                  value={formData.bank_details}
                  onChange={(value: string) => handleInputChange('bank_details', value)}
                  gridSize={{ xs: 12 }}
                  inputProps={{
                    multiline: true,
                    rows: 2,
                    sx: { borderRadius: '8px' }
                  }}
                />
              </Grid>
            </CardContent>
          </Card>

          {/* Audit Info */}
          {id && (
            <Card 
              elevation={0} 
              sx={{ 
                bgcolor: alpha(palette.info.main, 0.03), 
                border: `1px solid ${alpha(palette.info.main, 0.1)}`,
                borderRadius: '16px'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <SectionHeader title={t('contracts.contract_info')} icon={<Description fontSize="small" />} />
                <Stack spacing={2}>
                  {[
                    { label: t('contracts.posted_by'), value: formData.posted_by },
                    { label: t('contracts.finance_notified_by'), value: formData.finance_notified_by },
                    { label: t('contracts.posted_date'), value: formData.posted_date },
                    { label: t('contracts.modified_date'), value: formData.modified_date }
                  ].map((item, idx) => (
                    <Box key={idx} display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: 700, color: palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" fontWeight="600" color="text.primary">
                        {item.value || t('common.na')}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
};

export default ContractDetailsTab;