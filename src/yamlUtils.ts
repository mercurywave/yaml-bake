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

/**
 * Validates field definitions recursively
 */
function validateFields(spec: Spec, errors: string[], parentName: string, fields: { [key: string]: FieldDef }): void {
  for (const fieldName in fields) {
    const field = fields[fieldName];
    if (!field.type) {
      errors.push(`${parentName} field "${fieldName}" missing "type"`);
    }
    if (field.type === 'array' && !field.items) {
      errors.push(`${parentName} field "${fieldName}" of type "array" missing "items"`);
    }
    if (field.type === 'object' && !field.fields && !field.typeDef) {
      errors.push(`${parentName} field "${fieldName}" of type "object" missing "fields" or "typeDef"`);
    }
    if (field.type === 'object' && field.typeDef) {
      const typeDef = spec.types[field.typeDef];
      if(!typeDef) {
        errors.push(`${parentName} field "${fieldName}" of has unknown "typeDef"`);
      }
    }
    if (field.type === 'enum' && !field.options) {
      errors.push(`${parentName} field "${fieldName}" of type "enum" missing "options"`);
    }
    if (field.type === 'reference' && !field.target) {
      errors.push(`${parentName} field "${fieldName}" of type "reference" missing "target"`);
    }
  }
}

export function validateSpec(spec: Spec): string[] {
  const errors: string[] = [];
  
  // Ensure spec is an object
  if (!spec || typeof spec !== 'object') {
    errors.push('Spec must be an object');
    return errors;
  }
  
  // Ensure databases exists and is an object
  if (!spec.databases || typeof spec.databases !== 'object' || Array.isArray(spec.databases)) {
    errors.push('Spec must have a "databases" object');
    return errors;
  }
  
  // Check each database in the databases object
  for (const dbName in spec.databases) {
    const db = spec.databases[dbName];
    if (!db.fields || typeof db.fields !== 'object' || Array.isArray(db.fields)) {
      errors.push(`Database "${dbName}" missing "fields" object`);
    } else {
      validateFields(spec, errors, `Database "${dbName}"`, db.fields);
    }
  }
  
  // Ensure types exists and is an object
  if (spec.types && (typeof spec.types !== 'object' || Array.isArray(spec.types))) {
    errors.push('Spec "types" must be an object');
  } else if (spec.types) {
    // Check each type in the types object
    for (const typeName in spec.types) {
      const typeDef = spec.types[typeName];
      if (!typeDef.fields || typeof typeDef.fields !== 'object' || Array.isArray(typeDef.fields)) {
        errors.push(`Type "${typeName}" missing "fields" object`);
      } else {
        validateFields(spec, errors, `Type "${typeName}"`, typeDef.fields);
      }
    }
  }
  
  return errors;
}

export function cleanupSpec(spec: Spec): Spec {
  // Create a copy of the spec to avoid modifying the original
  const updatedSpec = JSON.parse(JSON.stringify(spec));

  updatedSpec.databases ??= {};
  updatedSpec.types ??= {};
  
  // For each database, ensure it has a UUID field
  for (const dbName in updatedSpec.databases) {
    const db = updatedSpec.databases[dbName];
    
    // If there's no id field defined, add it
    if (!db.fields.id) {
      db.fields.id = {
        type: 'uuid',
        required: true,
        unique: true
      };
    }
    // If the id field exists but doesn't have the proper UUID configuration, update it
    else if (db.fields.id.type !== 'uuid') {
      db.fields.id = {
        type: 'uuid',
        required: true,
        unique: true
      };
    }
  }
  
  return updatedSpec;
}

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