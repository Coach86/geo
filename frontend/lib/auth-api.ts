/**
 * Authentication API utilities for frontend
 * 
 * This file re-exports all API functions from the new modular structure
 * for backward compatibility
 */

// Re-export everything from the new API structure
export * from './api';

// Also re-export the report types that were imported in the original file
export type { ReportResponse } from '../types/reports';