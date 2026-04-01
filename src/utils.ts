import { SaveResult, ValidationError } from './types';
import * as yaml from 'yaml';

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

export function parseYaml(content: string): any {
  if (!content.trim()) {
    return {};
  }
  return yaml.parse(content);
}

export function stringifyYaml(data: any): string {
  return yaml.stringify(data);
}