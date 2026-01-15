import React from 'react';
import { Autocomplete, TextField, MenuItem, InputAdornment } from '@mui/material';
import Grid from '@mui/material/Grid2';

interface AutocompleteOption {
  id: any;
  [key: string]: any;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'select' | 'autocomplete';
  value?: any;
  onChange?: (value: any) => void;
  options?: { value: any; label: string }[];
  autocompleteOptions?: AutocompleteOption[];
  getOptionLabel?: (option: AutocompleteOption) => string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  gridSize?: { xs?: number; md?: number };
  endAdornment?: React.ReactNode;
  selectProps?: any;
  inputProps?: any;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  type = 'text',
  value,
  onChange,
  options = [],
  autocompleteOptions = [],
  getOptionLabel = (opt) => {
    if (!opt) return '';
    if (typeof opt === 'string') return opt;
    return opt.label || opt.name || opt.contact_name || opt.toString() || '';
  },
  placeholder,
  disabled = false,
  size = 'small',
  fullWidth = true,
  gridSize = { xs: 12, md: 6 },
  endAdornment,
  selectProps,
  inputProps,
}) => {
  const renderField = () => {
    const commonProps = {
      fullWidth,
      size,
      disabled,
      placeholder,
      ...inputProps,
    };

    if (type === 'autocomplete') {
      return (
        <Autocomplete
          {...commonProps}
          options={autocompleteOptions}
          getOptionLabel={getOptionLabel}
          value={autocompleteOptions.find((opt) => opt?.id === value) || null}
          onChange={(_, val) => onChange?.(val && typeof val === 'object' && val !== null && 'id' in val ? val.id : '')}
          renderInput={(params) => <TextField {...params} />}
        />
      );
    }

    if (type === 'select') {
      return (
        <TextField
          {...commonProps}
          select
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          SelectProps={selectProps}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        {...commonProps}
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        InputProps={endAdornment ? { endAdornment } : undefined}
      />
    );
  };

  return (
    <Grid size={gridSize}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label} {required && <span style={{ color: '#f44336' }}>*</span>}
        </span>
      </div>
      {renderField()}
    </Grid>
  );
};

export default FormField;