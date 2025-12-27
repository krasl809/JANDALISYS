import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
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
  const isRTL = i18n.language === 'ar';

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

  // إعدادات الألوان المخصصة (Enterprise Palette)
  const palette = useMemo(() => ({
    mode,
    primary: {
      main: mode === 'light' ? '#0F172A' : '#38BDF8', // كحلي للفاتح، سماوي للداكن
      light: mode === 'light' ? '#1E293B' : '#60A5FA',
      dark: mode === 'light' ? '#0A0F1C' : '#0284C7',
    },
    secondary: {
      main: mode === 'light' ? '#334155' : '#94A3B8',
    },
    success: {
      main: '#10B981', // Professional green for positive metrics
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B', // Amber for alerts
      light: '#FCD34D',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444', // Red for critical issues
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6', // Blue for neutral information
      light: '#60A5FA',
      dark: '#2563EB',
    },
    // Financial dashboard specific colors
    financial: {
      positive: '#10B981', // Success green
      negative: '#EF4444', // Error red
      neutral: '#6B7280', // Gray for neutral
      accent: '#6366F1', // Indigo accent
      chart: {
        primary: '#0F172A',
        secondary: '#38BDF8',
        tertiary: '#8B5CF6',
        quaternary: '#F59E0B',
      }
    },
    background: {
      default: mode === 'light' ? '#F3F4F6' : '#0B1120', // خلفية الصفحة (داكنة جداً في الليلي)
      paper: mode === 'light' ? '#FFFFFF' : '#1E293B',   // خلفية البطاقات (أفتح قليلاً)
    },
    text: {
      primary: mode === 'light' ? '#1E293B' : '#F8FAFC', // نص أبيض في الليلي
      secondary: mode === 'light' ? '#64748B' : '#CBD5E1', // نص رمادي فاتح في الليلي
    },
    divider: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
  }), [mode]);

  const theme = useMemo(() => createTheme({
    direction: isRTL ? 'rtl' : 'ltr',
    palette,
    typography: {
      fontFamily: '"Inter", "Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0em',
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '0em',
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0em',
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0em',
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.6,
        letterSpacing: '0em',
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '0em',
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
        textTransform: 'none',
      },
    },
    components: {
      // 1. تخصيص حقول الإدخال (Text Fields)
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#FFFFFF', // خلفية الحقل
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.23)', // لون الإطار
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'dark' ? '#94A3B8' : '#334155', // لون الإطار عند التحويم
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary.main, // لون الإطار عند الكتابة
            },
            color: palette.text.primary, // لون النص المكتوب
          },
          input: {
            '&::placeholder': {
              color: mode === 'dark' ? '#94A3B8' : '#64748B',
              opacity: 0.7
            }
          }
        },
      },
      // 2. تخصيص عناوين الحقول (Labels)
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: palette.text.secondary,
            '&.Mui-focused': {
              color: palette.primary.main,
            },
          },
        },
      },
      // 3. تخصيص القوائم المنسدلة (Dropdowns/Select)
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: palette.background.paper, // لون خلفية القائمة المنسدلة
            backgroundImage: 'none',
            border: `1px solid ${palette.divider}`,
          },
        },
      },
      // 4. تخصيص البطاقات (Cards)
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: palette.background.paper,
            backgroundImage: 'none',
            borderRadius: 12,
            border: `1px solid ${palette.divider}`,
            boxShadow: mode === 'light'
              ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
              : '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
            transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
            '&:hover': {
              boxShadow: mode === 'light'
                ? '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)'
                : '0 4px 6px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)',
              transform: 'translateY(-2px)',
            },
          }
        }
      },
      // 5. تخصيص الأزرار
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            padding: '8px 16px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: mode === 'light'
                ? '0 2px 4px rgba(0,0,0,0.1)'
                : '0 2px 4px rgba(0,0,0,0.3)',
            },
          },
          contained: {
            boxShadow: mode === 'light'
              ? '0 1px 3px rgba(0,0,0,0.2)'
              : '0 1px 3px rgba(0,0,0,0.4)',
            '&:hover': {
              boxShadow: mode === 'light'
                ? '0 2px 6px rgba(0,0,0,0.2)'
                : '0 2px 6px rgba(0,0,0,0.4)',
            },
          },
        },
      },
      // 6. الهيدر (App Bar)
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 23, 42, 0.8)',
            borderBottom: `1px solid ${palette.divider}`,
            color: palette.text.secondary
          }
        }
      },
      
      // 7. تخصيص الرقائق (Chips)
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontWeight: 500,
            height: 28,
          },
          filled: {
            backgroundColor: palette.primary.main,
            color: '#fff',
            '&:hover': {
              backgroundColor: palette.primary.dark,
            },
          },
        },
      },
      
      // 8. تخصيص الصور الرمزية (Avatars)
      MuiAvatar: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
          rounded: {
            borderRadius: 8,
          },
        },
      }
    },
  }), [mode, palette]);

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