import { Spec, DatabaseDef, FieldDef, Record } from './types';
import * as yaml from 'yaml';

/**
 * Validates field definitions recursively
 */
function validateFields(spec: Spec, errors: string[], parentName: string, fields: { [key: string]: FieldDef }): void {
  for (const fieldName in fields) {
    const field = fields[fieldName];
    validateOneField(field, fieldName, errors, parentName, spec);
  }
}

function validateOneField(field: FieldDef, fieldName: string, errors: string[], parentName: string, spec: Spec) {
  if (!field.type) {
    errors.push(`${parentName} field "${fieldName}" missing "type"`);
    return;
  }

  // Handle built-in types with switch statement
  switch (field.type) {
    case 'array':
      if (!field.items) {
        errors.push(`${parentName} field "${fieldName}" of type "array" missing "items"`);
      }
      break;
    case 'object':
      if (!field.fields) {
        errors.push(`${parentName} field "${fieldName}" of type "object" missing "fields"`);
      } else {
        // Recursively validate child fields for object type
        validateFields(spec, errors, `${parentName} field "${fieldName}"`, field.fields);
      }
      break;
    case 'enum':
      if (!field.options) {
        errors.push(`${parentName} field "${fieldName}" of type "enum" missing "options"`);
      }
      break;
    case 'reference':
      if (!field.target) {
        errors.push(`${parentName} field "${fieldName}" of type "reference" missing "target"`);
      }
      break;
    case 'boolean':
    case 'number': 
    case 'string':
    case 'date':
    case 'uuid':
      break;
    default:
      if(!spec.types[field.type]){
        errors.push(`${parentName} field "${fieldName}"`)
      } else {
        validateOneField(spec.types[field.type], field.type, errors, "types", spec);
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
      validateOneField(typeDef, typeName, errors, "types", spec);
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