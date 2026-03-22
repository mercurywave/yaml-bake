import { Spec, DatabaseDef, FieldDef, Record } from './types';
import * as yaml from 'yaml';

export function parseYaml(content: string): any {
  if (!content.trim()) {
    return {};
  }
  return yaml.parse(content);
}

export function stringifyYaml(data: any): string {
  return yaml.stringify(data);
}

export function validateSpec(spec: any): string[] {
  const errors: string[] = [];
  
  // Ensure spec is an object
  if (!spec || typeof spec !== 'object') {
    errors.push('Spec must be an object');
    return errors;
  }
  
  // Ensure databases exists and is an array
  if (!spec.databases || !Array.isArray(spec.databases)) {
    errors.push('Spec must have a "databases" array');
    return errors;
  }
  
  spec.databases.forEach((db: any, index: number) => {
    if (!db.name) {
      errors.push(`Database at index ${index} missing "name" field`);
    }
    if (!db.fields || !Array.isArray(db.fields)) {
      errors.push(`Database "${db.name}" missing "fields" array`);
    } else {
      db.fields.forEach((field: any, fieldIndex: number) => {
        if (!field.name) {
          errors.push(`Database "${db.name}" field at index ${fieldIndex} missing "name"`);
        }
        if (!field.type) {
          errors.push(`Database "${db.name}" field "${field.name}" missing "type"`);
        }
        if (field.type === 'array' && !field.items) {
          errors.push(`Database "${db.name}" field "${field.name}" of type "array" missing "items"`);
        }
        if (field.type === 'object' && !field.fields) {
          errors.push(`Database "${db.name}" field "${field.name}" of type "object" missing "fields"`);
        }
        if (field.type === 'enum' && !field.options) {
          errors.push(`Database "${db.name}" field "${field.name}" of type "enum" missing "options"`);
        }
        if (field.type === 'reference' && !field.target) {
          errors.push(`Database "${db.name}" field "${field.name}" of type "reference" missing "target"`);
        }
      });
    }
  });
  
  return errors;
}

export function validateRecord(record: any, database: DatabaseDef): string[] {
  const errors: string[] = [];
  
  if (!record || typeof record !== 'object') {
    errors.push('Record must be an object');
    return errors;
  }
  
  database.fields.forEach((field) => {
    if (record[field.name] === undefined || record[field.name] === null) {
      if (field.required) {
        errors.push(`Field "${field.name}" is required`);
      }
      return;
    }
    
    const value = record[field.name];
    
    if (field.type === 'string' && typeof value !== 'string') {
      errors.push(`Field "${field.name}" must be a string`);
    } else if (field.type === 'number' && typeof value !== 'number') {
      errors.push(`Field "${field.name}" must be a number`);
    } else if (field.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Field "${field.name}" must be a boolean`);
    } else if (field.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`Field "${field.name}" must be an array`);
      } else if (field.items) {
        value.forEach((item: any, idx: number) => {
          if (!isValidType(item, field.items!.type)) {
            errors.push(`Field "${field.name}" item at index ${idx} is invalid`);
          }
        });
      }
    } else if (field.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        errors.push(`Field "${field.name}" must be an object`);
      } else if (field.fields) {
        field.fields.forEach((nestedField) => {
          if (nestedField.name in value) {
            if (!isValidType(value[nestedField.name], nestedField.type)) {
              errors.push(`Field "${field.name}.${nestedField.name}" has invalid type`);
            }
          } else if (nestedField.required) {
            errors.push(`Field "${field.name}.${nestedField.name}" is required`);
          }
        });
      }
    } else if (field.type === 'enum' && field.options && !field.options.includes(value)) {
      errors.push(`Field "${field.name}" must be one of: ${field.options.join(', ')}`);
    } else if (field.type === 'reference' && field.target) {
      if (typeof value !== 'string') {
        errors.push(`Field "${field.name}" must be a string (reference ID)`);
      }
    }
  });
  
  return errors;
}

function isValidType(value: any, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return typeof value === 'string' || value instanceof Date;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && !Array.isArray(value) && value !== null;
    case 'enum':
      return typeof value === 'string';
    case 'reference':
      return typeof value === 'string';
    default:
      return true;
  }
}