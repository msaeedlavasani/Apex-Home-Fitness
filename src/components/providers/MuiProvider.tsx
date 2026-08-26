'use client';

import {ThemeProvider} from '@mui/material';
import type {ReactNode} from 'react';

import {apexMuiTheme} from '@/lib/ui/muiTheme';

export function MuiProvider({children}: {children: ReactNode}) {
  return (
    <ThemeProvider theme={apexMuiTheme}>{children}</ThemeProvider>
  );
}
