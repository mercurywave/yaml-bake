import { Spec, DatabaseDef, FieldDef, Record } from './types';

/**
 * Validates a single field value
 */
function validateSingleFieldValue(spec: Spec, errors: string[], parentName: string, fieldName: string, field: FieldDef, value: any): void {
  if (value === undefined || value === null) {
    if (field.required) {
      errors.push(`Field "${parentName}.${fieldName}" is required`);
    }
    return;
  }
  
  if (field.type === 'string' && typeof value !== 'string') {
    errors.push(`Field "${parentName}.${fieldName}" must be a string`);
  } else if (field.type === 'number' && typeof value !== 'number') {
    errors.push(`Field "${parentName}.${fieldName}" must be a number`);
  } else if (field.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`Field "${parentName}.${fieldName}" must be a boolean`);
  } else if (field.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`Field "${parentName}.${fieldName}" must be an array`);
    } else if (field.items) {
      value.forEach((item: any, idx: number) => {
        if (!isValidType(item, field.items!.type)) {
          errors.push(`Field "${parentName}.${fieldName}" item at index ${idx} is invalid`);
        }
      });
    }
  } else if (field.type === 'object') {
    if (typeof value !== 'object' || Array.isArray(value) || value === null) {
      errors.push(`Field "${parentName}.${fieldName}" must be an object`);
    } else if (field.fields) {
      // Check nested fields recursively
      validateFieldValues(spec, errors, `${parentName}.${fieldName}`, field.fields, value);
    } else if(field.typeDef) {
      const typeDef = spec.types[field.typeDef!];
      if (typeDef){
        validateFieldValues(spec, errors, `${parentName}.${fieldName}`, typeDef.fields, value);
      }
    }
  } else if (field.type === 'enum' && field.options && !field.options.includes(value)) {
    errors.push(`Field "${parentName}.${fieldName}" must be one of: ${field.options.join(', ')}`);
  } else if (field.type === 'reference' && field.target) {
    if (typeof value !== 'string') {
      errors.push(`Field "${parentName}.${fieldName}" must be a string (reference ID)`);
    }
  }
}

/**
 * Validates field values recursively
 */
function validateFieldValues(spec: Spec, errors: string[], parentName: string, fields: { [key: string]: FieldDef }, record: any): void {
  for (const fieldName in fields) {
    const field = fields[fieldName];
    const value = record[fieldName];
    validateSingleFieldValue(spec, errors, parentName, fieldName, field, value);
  }
  for (const fieldName in record) {
    if(!fields.hasOwnProperty(fieldName)) {
      errors.push(`Field "${parentName}.${fieldName}" is not defined`);
    }
  }
}

export function validateRecord(spec: Spec, record: any, database: DatabaseDef): string[] {
  const errors: string[] = [];
  
  if (!record || typeof record !== 'object') {
    errors.push('Record must be an object');
    return errors;
  }
  
  // Validate all fields
  validateFieldValues(spec, errors, '', database.fields, record);
  
  // Additional validation: check that record has an id field
  if (!record.id) {
    errors.push('Record must have an id field');
  }
  
  return errors;
}

export function generateDisplayName(record: Record, database: DatabaseDef): string {
  // If there's no display property, return a default name
  if (!database.display) {
    // Default to using the first string field or id if available
    for (const fieldName in database.fields) {
      const field = database.fields[fieldName];
      if (field.type === 'string' && record[fieldName]) {
        return record[fieldName];
      }
    }
    // If no string fields, return id
    return record.id || 'Unnamed Record';
  }

  // Parse the display template and replace fields
  let displayName = database.display;
  
  // Replace placeholders like {fieldName} with actual field values
  const regex = /\{([^}]+)\}/g;
  displayName = displayName.replace(regex, (match, fieldName) => {
    const value = record[fieldName];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
  
  return displayName;
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