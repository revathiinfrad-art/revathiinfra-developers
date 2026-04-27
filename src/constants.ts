/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlotStatus } from './types';

export const COLORS = {
  primary: '#C5A059', // Gold-ish from logo
  secondary: '#1A237E', // Deep blue
  accent: '#B0893E',
  background: '#F8F9FA',
  white: '#FFFFFF',
  text: {
    dark: '#1F2937',
    light: '#6B7280',
  },
  status: {
    [PlotStatus.AVAILABLE]: '#10B981', // Green
    [PlotStatus.SOLD]: '#EF4444', // Red
    [PlotStatus.RESERVED]: '#F59E0B', // Orange
  }
};

export const BRAND_NAME = "Revathi Infra Developers";

export const PLOT_FACINGS = ["East", "West", "North", "South", "NE", "NW", "SE", "SW"];
