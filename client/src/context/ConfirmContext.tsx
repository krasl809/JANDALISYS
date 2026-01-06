import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button, 
  Typography,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, Warning as WarningIcon, Info as InfoIcon, Error as ErrorIcon, CheckCircle as SuccessIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'confirm' | 'alert' | 'error' | 'warning' | 'success';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (message: string, title?: string, type?: 'info' | 'error' | 'warning' | 'success') => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((confirmOptions: ConfirmOptions): Promise<boolean> => {
    setOptions(confirmOptions);
    setOpen(true);
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const alert = useCallback((message: string, title?: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    setOptions({
      message,
      title: title || (
        type === 'error' ? t('Error') : 
        type === 'warning' ? t('Warning') : 
        type === 'success' ? t('Success') :
        t('Information')
      ),
      type: type === 'info' ? 'alert' : type,
      confirmText: t('OK')
    });
    setOpen(true);
  }, [t]);

  const handleClose = () => {
    setOpen(false);
    if (resolvePromise) resolvePromise(false);
  };

  const handleConfirm = () => {
    setOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  const getIcon = () => {
    switch (options.type) {
      case 'error': return <ErrorIcon color="error" sx={{ fontSize: 40 }} />;
      case 'warning': return <WarningIcon color="warning" sx={{ fontSize: 40 }} />;
      case 'success': return <SuccessIcon color="success" sx={{ fontSize: 40 }} />;
      case 'confirm': return <WarningIcon color="primary" sx={{ fontSize: 40 }} />;
      default: return <InfoIcon color="info" sx={{ fontSize: 40 }} />;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 320 }
        }}
      >
        <DialogTitle id="confirm-dialog-title" sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {getIcon()}
          <Typography variant="h6" component="span" fontWeight="bold">
            {options.title || t('Confirm')}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2 }}>
          <DialogContentText id="confirm-dialog-description" sx={{ color: 'text.primary', fontSize: '1rem' }}>
            {options.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0, gap: 1 }}>
          {options.type !== 'alert' && options.type !== 'error' && options.type !== 'warning' && (
            <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 'bold' }}>
              {options.cancelText || t('Cancel')}
            </Button>
          )}
          <Button 
            onClick={handleConfirm} 
            variant="contained" 
            autoFocus 
            color={options.type === 'error' ? 'error' : options.type === 'warning' ? 'warning' : 'primary'}
            sx={{ fontWeight: 'bold', px: 3 }}
          >
            {options.confirmText || t('OK')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
};
