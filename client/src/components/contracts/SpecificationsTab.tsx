import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  TextField, 
  IconButton, 
  Button, 
  Card, 
  CardContent, 
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Paper,
  Tooltip,
  useTheme,
  alpha,
  Stack,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  DragHandle as DragHandleIcon,
  Description as SpecIcon,
  AutoAwesome as AutoIcon,
  Inventory as ItemIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { ContractItem, ContractItemSpecification } from '../../types/contracts';

interface SpecificationsTabProps {
  items: ContractItem[];
  onItemChange: (itemId: string, field: string, value: any) => void;
  disabled?: boolean;
}

const DEFAULT_SPECS = [
  { key: 'Moisture', value: 'Max. 14%' },
  { key: 'Broken Kernels', value: 'Max. 5%' },
  { key: 'Damaged Kernels', value: 'Max. 5%' },
  { key: 'Protein', value: 'min 7.3%' },
  { key: 'Foreign matter', value: 'Max. 2%' },
  { key: 'Total Aflatoxin', value: 'Max. 20 ppb' },
  { key: 'Dead insects/snails', value: 'max 20/liter' },
  { key: 'Alive insects', value: 'Nil' },
  { key: 'Glass/stones/animal pollutants', value: 'Nil' },
  { key: 'Aflatoxin B1', value: 'max 0.02 PPM' },
];

const SpecificationsTab: React.FC<SpecificationsTabProps> = ({ items, onItemChange, disabled }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  const inputSx = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.5) : '#fff',
      borderRadius: 2,
      transition: 'all 0.2s',
      '& fieldset': {
        borderColor: theme.palette.mode === 'dark' 
          ? alpha(theme.palette.divider, 0.8) 
          : alpha(theme.palette.divider, 0.8),
        borderWidth: '1.5px',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: '1px',
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: '1.8px',
        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
      },
    },
    '& .MuiInputLabel-root': {
        fontSize: '0.85rem',
        fontWeight: 600,
        color: theme.palette.text.secondary,
        '&.Mui-focused': {
          color: theme.palette.primary.main,
        }
    }
  }), [theme]);

  const handleAddSpec = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const specs = [...(item.specifications || [])];
    specs.push({
      id: Date.now().toString(),
      spec_key: '',
      spec_value: '',
      display_order: specs.length
    });
    onItemChange(itemId, 'specifications', specs);
  };

  const handleRemoveSpec = (itemId: string, specId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const specs = (item.specifications || []).filter((s: ContractItemSpecification) => s.id !== specId);
    onItemChange(itemId, 'specifications', specs);
  };

  const handleSpecChange = (itemId: string, specId: string, field: string, value: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const specs = (item.specifications || []).map((s: ContractItemSpecification) => 
      s.id === specId ? { ...s, [field]: value } : s
    );
    onItemChange(itemId, 'specifications', specs);
  };

  const handleApplyDefaults = (itemId: string) => {
    const defaultSpecs = DEFAULT_SPECS.map((s, idx) => ({
      id: `default-${idx}-${Date.now()}`,
      spec_key: s.key,
      spec_value: s.value,
      display_order: idx
    }));
    onItemChange(itemId, 'specifications', defaultSpecs);
  };

  if (items.length === 0) {
    return (
      <Box sx={{ 
        p: 8, 
        textAlign: 'center',
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        borderRadius: 4,
        border: `1px dashed ${theme.palette.divider}`
      }}>
        <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t('contracts.no_items_title', 'No Items Added')}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {t('contracts.no_items_desc', 'Please add items to the contract first to define their specifications.')}
        </Typography>
      </Box>
    );
  }

  const activeItem = items[activeItemIndex] || items[0];

  return (
    <Grid container spacing={3}>
      {/* Item Selection Sidebar */}
      <Grid item xs={12} md={3.5}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, px: 1 }}>
          <ItemIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {t('contracts.items_list', 'Contract Items')}
          </Typography>
        </Stack>
        
        <Paper 
            variant="outlined" 
            sx={{ 
                borderRadius: 3, 
                overflow: 'hidden',
                bgcolor: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.6),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: (theme as any).boxShadows?.sm
            }}
        >
          <List component="nav" sx={{ p: 0 }}>
            {items.map((item, index) => {
              const isActive = activeItemIndex === index;
              return (
                <React.Fragment key={item.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={isActive}
                      onClick={() => setActiveItemIndex(index)}
                      sx={{
                        py: 2,
                        px: 2.5,
                        transition: 'all 0.2s ease',
                        borderLeft: '4px solid transparent',
                        ...(isActive && {
                          borderLeftColor: theme.palette.primary.main,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                          }
                        }),
                        '&:hover': {
                           bgcolor: alpha(theme.palette.action.hover, 0.04),
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <SpecIcon 
                          sx={{ 
                            fontSize: 22,
                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                            transition: 'color 0.2s'
                          }} 
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: isActive ? 700 : 500,
                              color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
                              fontSize: '0.9rem'
                            }}
                          >
                            {item.article_name || t('contracts.unnamed_item', 'Unnamed Item')}
                          </Typography>
                        } 
                        secondary={
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: theme.palette.text.secondary,
                              display: 'flex',
                              alignItems: 'center',
                              mt: 0.5
                            }}
                          >
                            <strong>{item.qty_ton || 0}</strong> &nbsp;{t('contracts.tons', 'Tons')}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < items.length - 1 && <Divider sx={{ opacity: 0.6 }} />}
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      </Grid>

      {/* Specifications Editor */}
      <Grid item xs={12} md={8.5}>
        <Card 
            variant="outlined" 
            sx={{ 
                borderRadius: 4,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                boxShadow: (theme as any).boxShadows?.md,
                bgcolor: theme.palette.mode === 'light' ? '#fff' : alpha(theme.palette.background.paper, 0.4),
                minHeight: 500
            }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' }, 
                mb: 4,
                gap: 2
            }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
                  {t('contracts.specs_for', 'Specifications for')} {activeItem.article_name || t('contracts.unnamed_item', 'Unnamed Item')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
                  <InfoIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                  {t('contracts.specs_desc', 'Define technical requirements and quality standards for this item.')}
                </Typography>
              </Box>
              
              <Stack direction="row" spacing={1.5}>
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<AutoIcon />}
                  onClick={() => handleApplyDefaults(activeItem.id)}
                  disabled={disabled}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                    '&:hover': {
                        borderColor: theme.palette.primary.main,
                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                    }
                  }}
                >
                  {t('contracts.apply_standard', 'Apply Standard Specs')}
                </Button>
                <Button 
                  variant="contained" 
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddSpec(activeItem.id)}
                  disabled={disabled}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: (theme as any).boxShadows?.colored?.primary,
                    px: 2
                  }}
                >
                  {t('contracts.add_spec', 'Add Specification')}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ mb: 3, opacity: 0.1 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(activeItem.specifications || []).length === 0 ? (
                <Box sx={{ 
                    py: 10, 
                    textAlign: 'center', 
                    bgcolor: alpha(theme.palette.action.hover, 0.02),
                    borderRadius: 3,
                    border: `1px dashed ${alpha(theme.palette.divider, 0.15)}`
                }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('contracts.no_specs_yet', 'No specifications added yet.')}
                  </Typography>
                  <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => handleAddSpec(activeItem.id)}
                    sx={{ mt: 1, fontWeight: 600 }}
                  >
                    {t('contracts.click_to_add', 'Click here to add the first one')}
                  </Button>
                </Box>
              ) : (
                activeItem.specifications?.map((spec, idx) => (
                  <Box 
                    key={spec.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      borderRadius: 3,
                      border: `1.5px solid ${alpha(theme.palette.divider, 0.4)}`,
                      bgcolor: theme.palette.mode === 'dark' 
                        ? alpha(theme.palette.background.default, 0.4) 
                        : alpha(theme.palette.background.paper, 0.8),
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark'
                          ? alpha(theme.palette.background.default, 0.6)
                          : theme.palette.background.paper,
                        boxShadow: (theme as any).boxShadows?.sm,
                        borderColor: theme.palette.primary.main,
                        transform: 'translateY(-2px)'
                      }
                    }}
                  >
                    <IconButton size="small" sx={{ cursor: 'grab', color: 'text.disabled' }}>
                      <DragHandleIcon fontSize="small" />
                    </IconButton>
                    
                    <Grid container spacing={2} sx={{ flexGrow: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label={t('contracts.spec_name', 'Specification Name')}
                          placeholder={t('contracts.spec_name_placeholder', 'e.g., Moisture')}
                          value={spec.spec_key}
                          onChange={(e) => handleSpecChange(activeItem.id, spec.id!, 'spec_key', e.target.value)}
                          disabled={disabled}
                          sx={inputSx}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label={t('contracts.spec_value', 'Value / Limit')}
                          placeholder={t('contracts.spec_value_placeholder', 'e.g., Max. 14%')}
                          value={spec.spec_value}
                          onChange={(e) => handleSpecChange(activeItem.id, spec.id!, 'spec_value', e.target.value)}
                          disabled={disabled}
                          sx={inputSx}
                        />
                      </Grid>
                    </Grid>

                    <Tooltip title={t('common.delete', 'Delete')}>
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveSpec(activeItem.id, spec.id!)}
                        disabled={disabled}
                        sx={{ 
                            bgcolor: alpha(theme.palette.error.main, 0.05),
                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SpecificationsTab;
