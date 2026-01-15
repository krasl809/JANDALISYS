import React from 'react';
import { Box, Typography, Button, IconButton, Autocomplete, Tooltip, alpha, useTheme } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface AutocompleteWithAddProps {
  options: any[];
  value: any;
  onChange: (event: React.SyntheticEvent, value: any) => void;
  getOptionLabel: (option: any) => string;
  entityType: 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm';
  onAddClick: (entityType: 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm') => void;
  renderInput: (params: any) => React.ReactNode;
  placeholder?: string;
}

const AutocompleteWithAdd: React.FC<AutocompleteWithAddProps> = React.memo(({
  options,
  value,
  onChange,
  getOptionLabel,
  entityType,
  onAddClick,
  renderInput,
  placeholder
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Autocomplete
        size="small"
        options={options}
        value={value}
        onChange={onChange}
        getOptionLabel={getOptionLabel}
        renderInput={(params) => renderInput({ ...params, placeholder })}
        sx={{ flexGrow: 1 }}
        noOptionsText={
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('No {{entityType}}s found', { entityType: t(entityType.charAt(0).toUpperCase() + entityType.slice(1)) })}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => onAddClick(entityType)}
              sx={{ mt: 1 }}
            >
              {t('Add New {{entityType}}', { entityType: t(entityType.charAt(0).toUpperCase() + entityType.slice(1)) })}
            </Button>
          </Box>
        }
      />
      <Tooltip title={t('Add new {{entityType}}', { entityType: t(entityType) })}>
        <IconButton
          size="small"
          onClick={() => onAddClick(entityType)}
          sx={{
            color: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
          }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
});

export default AutocompleteWithAdd;
