import React, { createContext, useState, useMemo, useContext } from 'react';
import { ThemeProvider, createTheme, CssBaseline, alpha } from '@mui/material';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { useTranslation } from 'react-i18next';

// تعريف نوع الكونتكست
interface ColorModeContextType {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

const ColorModeContext = createContext<ColorModeContextType>({ toggleColorMode: () => { }, mode: 'light' });

export const useColorMode = () => useContext(ColorModeContext);

// Create persistent caches
const cacheLtr = createCache({
  key: 'mui',
});

const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

export const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language.startsWith('ar');

  // قراءة الوضع من LocalStorage
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('themeMode') as 'light' | 'dark') || 'light';
  });

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prevMode) => {
        const newMode = prevMode === 'light' ? 'dark' : 'light';
        localStorage.setItem('themeMode', newMode);
        return newMode;
      });
    },
    mode,
  }), [mode]);

  // إعدادات الألوان المخصصة (Material Dashboard 2 Pro Palette)
  const palette = useMemo(() => ({
    mode,
    primary: {
      main: '#5E72E4',
      light: '#825EE4',
      dark: '#324CBB',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#8392AB',
      light: '#A8B8D8',
      dark: '#596C88',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2DCE89',
      light: '#62EAB1',
      dark: '#1E9D68',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FB6340',
      light: '#FD947D',
      dark: '#D13E1B',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#F5365C',
      light: '#F8738E',
      dark: '#B81938',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#11CDEF',
      light: '#48DDF4',
      dark: '#0B93AC',
      contrastText: '#FFFFFF',
    },
    background: {
      default: mode === 'light' ? '#F8F9FA' : '#1a2035',
      paper: mode === 'light' ? '#FFFFFF' : '#1f283e',
    },
    text: {
      primary: mode === 'light' ? '#344767' : '#FFFFFF',
      secondary: mode === 'light' ? '#8392AB' : 'rgba(255, 255, 255, 0.7)',
      disabled: mode === 'light' ? '#E9ECEF' : 'rgba(255, 255, 255, 0.5)',
    },
    divider: mode === 'light' ? '#E9ECEF' : 'rgba(255, 255, 255, 0.12)',
    action: {
      active: mode === 'light' ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.7)',
      hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
      selected: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)',
      disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
      disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
      focus: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
    },
    // Material Dashboard Pro Custom Colors
    gradients: {
      primary: { main: '#5E72E4', state: '#825EE4' },
      secondary: { main: '#8392AB', state: '#596C88' },
      info: { main: '#11CDEF', state: '#1171EF' },
      success: { main: '#2DCE89', state: '#2DCE89' },
      warning: { main: '#FB6340', state: '#FD947D' },
      error: { main: '#F5365C', state: '#F8738E' },
      light: { main: '#EBEFF4', state: '#CED4DA' },
      dark: { main: '#344767', state: '#191919' },
    },
    coloredShadows: {
      primary: '#5E72E4',
      secondary: '#8392AB',
      info: '#11CDEF',
      success: '#2DCE89',
      warning: '#FB6340',
      error: '#F5365C',
      light: '#E9ECEF',
      dark: '#344767',
    },
    financial: {
      chart: {
        primary: '#5E72E4',
        secondary: '#11CDEF',
        tertiary: '#2DCE89',
        quaternary: '#FB6340',
      }
    }
  }), [mode]);

  const functions = useMemo(() => ({
    linearGradient: (color: string, colorState: string, angle = 195) => {
      return `linear-gradient(${angle}deg, ${color}, ${colorState})`;
    },
    pxToRem: (number: number, baseNumber = 16) => {
      return `${number / baseNumber}rem`;
    },
    rgba: (color: string, opacity: number) => {
      return `rgba(${color}, ${opacity})`;
    },
    boxShadow: (offset: number[], radius: number[], color: string, opacity: number, inset = "") => {
      const [x, y] = offset;
      const [blur, spread] = radius;
      return `${inset} ${x}px ${y}px ${blur}px ${spread}px rgba(${color}, ${opacity})`;
    },
  }), []);

  const theme = useMemo(() => createTheme({
    direction: isRTL ? 'rtl' : 'ltr',
    palette,
    shape: {
      borderRadius: 12,
    },
    // Use any to bypass MUI theme type restrictions for custom properties
    ...({
      boxShadows: {
        xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
        sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
        md: '0 7px 14px rgba(50, 50, 93, 0.1)',
        lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
        colored: {
          primary: '0 4px 20px 0 rgba(94, 114, 228, 0.4)',
          info: '0 4px 20px 0 rgba(17, 205, 239, 0.4)',
          success: '0 4px 20px 0 rgba(45, 206, 137, 0.4)',
          warning: '0 4px 20px 0 rgba(251, 99, 64, 0.4)',
          error: '0 4px 20px 0 rgba(245, 54, 92, 0.4)',
          dark: '0 4px 20px 0 rgba(52, 71, 103, 0.4)',
        }
      },
      functions,
    } as any),
    shadows: [
      'none',
      '0rem 0.125rem 0.5625rem -0.3125rem rgba(0, 0, 0, 0.15)',
      '0rem 0.25rem 0.375rem -0.0625rem rgba(0, 0, 0, 0.1), 0rem 0.125rem 0.25rem -0.0625rem rgba(0, 0, 0, 0.06)',
      '0rem 0.3125rem 0.625rem 0rem rgba(0, 0, 0, 0.12)',
      '0rem 0.5rem 1rem 0rem rgba(0, 0, 0, 0.14), 0rem 0.1875rem 0.25rem -0.125rem rgba(0, 0, 0, 0.2), 0rem 0.0625rem 0.625rem 0rem rgba(0, 0, 0, 0.12)',
      '0rem 0.625rem 1.5625rem -0.3125rem rgba(0, 0, 0, 0.2)',
      '0rem 1.25rem 1.5625rem 0rem rgba(0, 0, 0, 0.14), 0rem 0.5rem 0.625rem -0.3125rem rgba(0, 0, 0, 0.2), 0rem 0.1875rem 0.75rem 0rem rgba(0, 0, 0, 0.12)',
      ...Array(18).fill('none'),
    ] as any,
    typography: {
      fontFamily: '"Roboto", "Cairo", "Helvetica", "Arial", sans-serif',
      h1: { fontSize: '3rem', fontWeight: 600, lineHeight: 1.25, color: mode === 'light' ? '#344767' : '#FFFFFF' },
      h2: { fontSize: '2.25rem', fontWeight: 600, lineHeight: 1.3, color: mode === 'light' ? '#344767' : '#FFFFFF' },
      h3: { fontSize: '1.875rem', fontWeight: 600, lineHeight: 1.375, color: mode === 'light' ? '#344767' : '#FFFFFF' },
      h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.375, color: mode === 'light' ? '#344767' : '#FFFFFF' },
      h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.375, color: mode === 'light' ? '#344767' : '#FFFFFF' },
      h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.625, color: mode === 'light' ? '#344767' : '#FFFFFF' },
      subtitle1: { fontSize: '1.25rem', fontWeight: 300, lineHeight: 1.625 },
      subtitle2: { fontSize: '1rem', fontWeight: 300, lineHeight: 1.6 },
      body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.625 },
      body2: { fontSize: '0.875rem', fontWeight: 300, lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', fontWeight: 300, lineHeight: 1.25 },
      button: { textTransform: 'uppercase', fontWeight: 600, fontSize: '0.75rem' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: mode === 'light' ? '#f0f2f5' : '#1a2035',
            color: mode === 'light' ? '#344767' : '#FFFFFF',
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': { width: '8px', height: '8px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              background: mode === 'light' ? '#d2d6da' : '#333333',
              borderRadius: '10px',
              '&:hover': { background: mode === 'light' ? '#adb5bd' : '#444444' },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: '0rem 0.25rem 0.375rem -0.0625rem rgba(0, 0, 0, 0.1), 0rem 0.125rem 0.25rem -0.0625rem rgba(0, 0, 0, 0.06)',
            borderRadius: 12,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
            boxShadow: '0rem 0.25rem 0.375rem -0.0625rem rgba(0, 0, 0, 0.1), 0rem 0.125rem 0.25rem -0.0625rem rgba(0, 0, 0, 0.06)',
            padding: '1rem',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '0.625rem 1.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            transition: 'all 0.15s ease-in-out',
            '&:active': { transform: 'scale(0.98)' },
          },
          contained: {
            boxShadow: '0rem 0.1875rem 0.1875rem 0rem rgba(0, 0, 0, 0.1), 0rem 0.1875rem 0.0625rem -0.125rem rgba(0, 0, 0, 0.12), 0rem 0.0625rem 0.3125rem 0rem rgba(0, 0, 0, 0.2)',
            '&:hover': {
              boxShadow: '0rem 0.1875rem 0.1875rem 0rem rgba(0, 0, 0, 0.1), 0rem 0.1875rem 0.0625rem -0.125rem rgba(0, 0, 0, 0.12), 0rem 0.0625rem 0.3125rem 0rem rgba(0, 0, 0, 0.2)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: mode === 'light' ? 'transparent' : alpha(palette.background.paper, 0.4),
              '& fieldset': {
                borderColor: mode === 'light' ? '#d2d6da' : alpha(palette.divider, 0.45),
              },
              '&:hover fieldset': {
                borderColor: palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: palette.primary.main,
                borderWidth: 2,
              },
              '&.Mui-disabled': {
                backgroundColor: alpha(palette.action.disabledBackground, 0.05),
                '& fieldset': {
                  borderColor: alpha(palette.divider, 0.1),
                }
              }
            },
            '& .MuiInputBase-input::placeholder': {
              color: palette.text.secondary,
              opacity: 0.6,
            }
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            color: mode === 'light' ? '#344767' : '#FFFFFF',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            opacity: 0.7,
            borderBottom: `0.0625rem solid ${mode === 'light' ? '#f0f2f5' : 'rgba(255, 255, 255, 0.12)'}`,
          },
          root: {
            fontSize: '0.875rem',
            borderBottom: `0.0625rem solid ${mode === 'light' ? '#f0f2f5' : 'rgba(255, 255, 255, 0.12)'}`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 700,
            height: 24,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
          label: {
            padding: '0 8px',
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            minHeight: 48,
            borderBottom: mode === 'light' ? '1px solid #E6E9EF' : '1px solid #333333',
          },
          indicator: {
            height: 2,
            backgroundColor: '#0073EA',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            minHeight: 48,
            fontWeight: 400,
            fontSize: '0.875rem',
            padding: '6px 20px',
            color: mode === 'light' ? '#676879' : '#B1B1B1',
            transition: 'all 0.2s',
            '&.Mui-selected': {
              fontWeight: 600,
              color: '#0073EA',
            },
            '&:hover': {
              color: '#0073EA',
              backgroundColor: 'rgba(0, 115, 234, 0.05)',
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            border: '1px solid',
          },
          standardSuccess: {
            backgroundColor: '#E6FFF2',
            borderColor: '#00C875',
            color: '#007F4A',
          },
          standardError: {
            backgroundColor: '#FFEBEF',
            borderColor: '#DF2F4A',
            color: '#B01E34',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#323338',
            color: '#FFFFFF',
            fontSize: '0.75rem',
            padding: '8px 12px',
            borderRadius: 4,
          },
          arrow: {
            color: '#323338',
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: '#0073EA',
              boxShadow: '0 0 0 3px rgba(0, 115, 234, 0.2)',
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            marginTop: 4,
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            border: mode === 'light' ? '1px solid #E6E9EF' : '1px solid #333333',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            padding: '8px 16px',
            '&:hover': {
              backgroundColor: mode === 'light' ? 'rgba(0, 115, 234, 0.05)' : 'rgba(0, 115, 234, 0.1)',
            },
          },
        },
      },
      MuiStepper: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            padding: 0,
          },
        },
      },
      MuiStepConnector: {
        styleOverrides: {
          line: {
            borderColor: mode === 'light' ? '#E6E9EF' : '#333333',
          },
        },
      },
      MuiStepIcon: {
        styleOverrides: {
          root: {
            color: mode === 'light' ? '#E6E9EF' : '#333333',
            '&.Mui-active': {
              color: '#0073EA',
            },
            '&.Mui-completed': {
              color: '#00C875',
            },
          },
          text: {
            fill: '#FFFFFF',
            fontWeight: 600,
          },
        },
      },
      MuiStepLabel: {
        styleOverrides: {
          label: {
            fontSize: '0.75rem',
            fontWeight: 500,
            color: mode === 'light' ? '#676879' : '#B1B1B1',
            '&.Mui-active': {
              color: '#323338',
              fontWeight: 600,
            },
            '&.Mui-completed': {
              color: '#00C875',
            },
          },
        },
      },
    },
  }), [mode, palette, isRTL, functions]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <CacheProvider value={isRTL ? cacheRtl : cacheLtr}>
        <ThemeProvider theme={theme}>
          {/* CssBaseline مهم جداً لأنه يطبق لون الخلفية على كامل الصفحة */}
          <CssBaseline enableColorScheme />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
};
