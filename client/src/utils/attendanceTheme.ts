import { Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';

// --- Theme-Aware Utilities ---
export const getAttendanceColors = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    return {
        primary: theme.palette.primary.main,
        secondary: theme.palette.text.secondary,
        info: theme.palette.info.main,
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        dark: isDark ? theme.palette.text.primary : '#344767',
        light: isDark ? theme.palette.grey[800] : '#E9ECEF',
        bg: theme.palette.background.default,
        white: theme.palette.background.paper,
        pureWhite: '#FFFFFF',
        gradientPrimary: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        gradientSuccess: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
        gradientInfo: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
        gradientWarning: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
        gradientError: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
        gradientDark: isDark 
            ? `linear-gradient(135deg, ${theme.palette.grey[800]} 0%, ${theme.palette.common.black} 100%)`
            : `linear-gradient(135deg, #344767 0%, #192941 100%)`,
    };
};

export const getAttendanceShadows = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(50, 50, 93, 0.1)';
    return {
        xs: isDark ? '0 1px 3px rgba(0, 0, 0, 0.4)' : '0 1px 5px rgba(0, 0, 0, 0.05)',
        sm: isDark ? '0 4px 6px rgba(0, 0, 0, 0.5)' : '0 3px 8px rgba(0, 0, 0, 0.08)',
        md: isDark ? '0 8px 16px rgba(0, 0, 0, 0.6)' : `0 7px 14px ${shadowColor}`,
        lg: isDark ? '0 12px 24px rgba(0, 0, 0, 0.7)' : `0 15px 35px ${shadowColor}`,
    };
};

export const getAttendanceStatusColors = (theme: Theme) => {
    const colors = getAttendanceColors(theme);
    return {
        present: colors.success,
        late: colors.warning,
        earlyLeave: colors.info,
        absent: colors.secondary,
        holiday: alpha(colors.primary, 0.8),
        ongoing: colors.primary,
        overtime: alpha(colors.primary, 0.8),
        partial: alpha(colors.warning, 0.8),
        multiDay: colors.info
    };
};
