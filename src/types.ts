/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PlotStatus {
  AVAILABLE = 'Available',
  SOLD = 'Sold',
  RESERVED = 'Reserved',
}

export enum EmployeeRole {
  ADMIN = 'admin',
  STAFF = 'staff',
}

export interface Employee {
  id: string; // Document ID
  employeeId: string;
  username: string;
  name: string;
  email: string;
  role: EmployeeRole;
  photoUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  description: string;
  imageUrl: string;
  layoutUrl?: string;
  totalPlots: number;
  availablePlots?: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface Plot {
  id: string;
  projectId: string;
  plotNumber: string;
  size: string;
  status: PlotStatus;
  price: number;
  facing: string;
  customerName?: string;
  customerContact?: string;
  updatedBy: string; // Employee ID
  updatedAt: any; // Firestore Timestamp
}
