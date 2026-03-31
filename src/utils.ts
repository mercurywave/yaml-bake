import { SaveResult, ValidationError } from './types';

export function makeSaveSuccess(): SaveResult {
  return {
    success: true,
    errors: []
  };
}

export function makeSaveNoChange(): SaveResult {
  return {
    success: true,
    errors: [],
    noChange: true
  };
}

export function makeSaveError(message: string): SaveResult {
  return {
    success: false,
    errors: [{
      message,
      severity: 'error' as const
    }]
  };
}

export function makeSaveErrors(errors: string[]): SaveResult {
  return {
    success: false,
    errors: errors.map(msg => ({
      message: msg,
      severity: 'error' as const
    }))
  };
}