import {createTheme} from '@mui/material/styles';

/**
 * MUI bridge for gradual adoption.
 *
 * The existing Tailwind/CSS token system remains the visual source of truth
 * for current pages. MUI 9 validates palette colors while creating the theme,
 * so CSS custom-property references cannot be passed directly here. These
 * values mirror the light Apex tokens and only affect future MUI components;
 * current components continue to read their semantic CSS variables.
 */
export const apexMuiTheme = createTheme({
  direction: 'ltr',
  palette: {
    primary: {
      main: '#ff4500',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: 'rgba(60, 60, 67, 0.60)',
    },
    divider: 'rgba(60, 60, 67, 0.20)',
  },
  typography: {
    fontFamily: "'Vazirmatn', sans-serif",
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 200,
    },
  },
});
