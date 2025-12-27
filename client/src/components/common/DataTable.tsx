import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, TextField, InputAdornment, Typography, Box, useTheme, alpha, Button,
  Autocomplete
} from '@mui/material';
import { AddCircleOutline, Remove } from '@mui/icons-material';

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'autocomplete';
  width?: string;
  align?: 'left' | 'right' | 'center';
  options?: any[];
  getOptionLabel?: (option: any) => string;
  endAdornment?: React.ReactNode;
  renderCell?: (value: any, row: any, onChange: (value: any) => void) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column[];
  data: T[];
  onAdd?: () => void;
  onRemove?: (id: string) => void;
  onChange?: (id: string, field: string, value: any) => void;
  keyField?: string;
  emptyMessage?: string;
  showActions?: boolean;
  headerSx?: any;
  cellSx?: any;
  inputTableSx?: any;
}

const DataTable = <T extends { id: string }>({
  columns,
  data,
  onAdd,
  onRemove,
  onChange,
  keyField = 'id',
  emptyMessage = 'No data available',
  showActions = true,
  headerSx,
  cellSx,
  inputTableSx,
}: DataTableProps<T>) => {
  const theme = useTheme();

  const defaultHeaderSx = {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    color: theme.palette.text.secondary,
    fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase',
    borderBottom: `1px solid ${theme.palette.divider}`, padding: '12px 16px',
  };

  const defaultCellSx = {
    borderBottom: `1px solid ${theme.palette.divider}`,
    padding: '8px 12px',
    color: theme.palette.text.primary
  };

  const defaultInputTableSx = {
    '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: theme.palette.divider },
    fontSize: '0.9rem'
  };

  const renderCellContent = (column: Column, value: any, row: T) => {
    if (column.renderCell) {
      return column.renderCell(value, row, (newValue) => onChange?.(row[keyField as keyof T] as string, column.key, newValue));
    }

    if (column.type === 'autocomplete') {
      const options = column.options || [];
      const selectedOption = options.find(opt => opt.id === value) || null;

      return (            <Autocomplete
          size="small"
          options={options}
          value={selectedOption}
          onChange={(_, newValue) => {
            onChange?.(row[keyField as keyof T] as string, column.key, newValue?.id || '');
          }}
          getOptionLabel={(opt) => column.getOptionLabel ? column.getOptionLabel(opt) : (opt.label || opt.id || '')}
          renderInput={(params) => (
            <TextField 
              {...params} 
              variant="standard" 
              sx={inputTableSx || defaultInputTableSx}
            />
          )}
          sx={{ width: '100%' }}
        />
      );
    }

    return (
      <TextField
        variant="standard"
        type={column.type || 'text'}
        value={value || ''}
        onChange={(e) => onChange?.(row[keyField as keyof T] as string, column.key, e.target.value)}
        sx={inputTableSx || defaultInputTableSx}
        InputProps={{
          endAdornment: column.endAdornment ? (
            <InputAdornment position="end">
              {column.endAdornment}
            </InputAdornment>
          ) : undefined,
        }}
      />
    );
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                width={column.width}
                align={column.align}
                sx={headerSx || defaultHeaderSx}
              >
                {column.label}
              </TableCell>
            ))}
            {showActions && <TableCell width="40px" sx={headerSx || defaultHeaderSx}></TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (showActions ? 1 : 0)} align="center" sx={{ py: 8 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                key={`${row[keyField as keyof T] as string}-${index}`}
                sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}
              >
                {columns.map((column) => (
                  <TableCell key={`${column.key}-${index}`} align={column.align} sx={cellSx || defaultCellSx}>
                    {renderCellContent(column, row[column.key as keyof T], row)}
                  </TableCell>
                ))}
                {showActions && (
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => onRemove?.(row[keyField as keyof T] as string)}
                      sx={{ color: theme.palette.error.main }}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {onAdd && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <Button startIcon={<AddCircleOutline />} onClick={onAdd} size="small" variant="text">
            Add Item
          </Button>
        </Box>
      )}
    </TableContainer>
  );
};

export default DataTable;
export type { Column };