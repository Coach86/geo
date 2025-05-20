import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  // Load theme preference from localStorage on component mount
  useEffect(() => {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Save theme preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = createTheme({
    typography: {
      fontFamily: '"Public Sans", sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 700,
      },
      h4: {
        fontWeight: 700,
      },
      h5: {
        fontWeight: 700,
      },
      h6: {
        fontWeight: 700,
      },
      subtitle1: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            // Light mode palette from reference
            primary: {
              main: '#00AB55', // Green
              dark: '#007B55',
              light: '#5BE584',
              contrastText: '#FFFFFF',
            },
            secondary: {
              main: '#3366FF', // Blue
              dark: '#1939B7',
              light: '#84A9FF',
            },
            info: {
              main: '#00B8D9', // Cyan
              dark: '#006C9C',
              light: '#61F3F3',
            },
            success: {
              main: '#36B37E', // Green
              dark: '#1B806A',
              light: '#86E8AB',
            },
            warning: {
              main: '#FFAB00', // Orange
              dark: '#B76E00',
              light: '#FFD666',
            },
            error: {
              main: '#FF5630', // Red
              dark: '#B71D18',
              light: '#FF8F73',
            },
            grey: {
              100: '#F9FAFB',
              200: '#F4F6F8',
              300: '#DFE3E8',
              400: '#C4CDD5',
              500: '#919EAB',
              600: '#637381',
              700: '#454F5B',
              800: '#212B36',
              900: '#161C24',
            },
            text: {
              primary: '#212B36',
              secondary: '#637381',
              disabled: '#919EAB',
            },
            background: {
              default: '#F9FAFB',
              paper: '#FFFFFF',
            },
            divider: 'rgba(145, 158, 171, 0.24)',
          }
        : {
            // Dark mode palette from reference
            primary: {
              main: '#00AB55', // Green
              dark: '#007B55',
              light: '#5BE584',
              contrastText: '#FFFFFF',
            },
            secondary: {
              main: '#3366FF', // Blue
              dark: '#1939B7',
              light: '#84A9FF',
            },
            info: {
              main: '#00B8D9', // Cyan
              dark: '#006C9C',
              light: '#61F3F3',
            },
            success: {
              main: '#36B37E', // Green
              dark: '#1B806A',
              light: '#86E8AB',
            },
            warning: {
              main: '#FFAB00', // Orange
              dark: '#B76E00',
              light: '#FFD666',
            },
            error: {
              main: '#FF5630', // Red
              dark: '#B71D18',
              light: '#FF8F73',
            },
            grey: {
              100: '#161C24',
              200: '#212B36',
              300: '#454F5B',
              400: '#637381',
              500: '#919EAB',
              600: '#C4CDD5',
              700: '#DFE3E8',
              800: '#F4F6F8',
              900: '#F9FAFB',
            },
            text: {
              primary: '#FFFFFF',
              secondary: '#919EAB',
              disabled: '#637381',
            },
            background: {
              default: '#161C24',
              paper: '#212B36',
            },
            divider: 'rgba(145, 158, 171, 0.24)',
          }),
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};