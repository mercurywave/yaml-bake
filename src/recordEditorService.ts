import { Spec, DatabaseDef, Record, EditorState, SaveResult } from './types';
import { fileSystem } from './fileSystem';
import { parseYaml, stringifyYaml } from './yamlUtils';
import { validateRecord } from './dataValidator';

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  field?: string;
  line?: number;
}

export interface EditorData {
  content: string;
  spec?: Spec;
  database?: DatabaseDef;
  record?: Record;
  validationErrors: ValidationError[];
}

export class RecordEditorService {
  async loadEditorData(state: EditorState): Promise<EditorData> {
    const spec = await fileSystem.loadSpec();
    
    if (!state.databaseName) {
      throw new Error('Database name required for record editing');
    }

    const database = spec.databases[state.databaseName];
    if (!database) {
      throw new Error(`Database "${state.databaseName}" not found`);
    }

    const records = await fileSystem.loadDatabase(state.databaseName);
    
    if (state.recordId) {
      const record = records.find(r => r.id === state.recordId);
      if (!record) {
        throw new Error(`Record "${state.recordId}" not found`);
      }
      
      const recordErrors = validateRecord(spec, record, spec.databases[state.databaseName]).map(msg => ({
        message: msg,
        severity: 'error' as const
      }));
      
      return {
        content: stringifyYaml(record),
        spec,
        database,
        record,
        validationErrors: recordErrors
      };
    } else {
      const recordsYaml = stringifyYaml(records);
      const allErrors: ValidationError[] = [];
      
      records.forEach((record, index) => {
        const errors = validateRecord(spec, record, spec.databases[state.databaseName!]);
        errors.forEach(msg => {
          allErrors.push({
            message: `Record at index ${index}: ${msg}`,
            severity: 'error' as const
          });
        });
      });
      
      return {
        content: recordsYaml,
        spec,
        database,
        validationErrors: allErrors
      };
    }
  }

  async trySaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    try {
      const data = parseYaml(content);
      
      if (!state.databaseName) {
        return {
          success: false,
          errors: [{
            message: 'Database name required for record editing',
            severity: 'error' as const
          }]
        };
      }
      
      if (state.recordId) {
        const spec = await fileSystem.loadSpec();
        const database = spec.databases[state.databaseName];
        if (!database) {
          return {
            success: false,
            errors: [{
              message: `Database "${state.databaseName}" not found`,
              severity: 'error' as const
            }]
          };
        }
        
        const errors = validateRecord(spec, data, database);
        if (errors.length > 0) {
          const validationErrors = errors.map(msg => ({
            message: msg,
            severity: 'error' as const
          }));
          return {
            success: false,
            errors: validationErrors
          };
        }
        
        await fileSystem.updateRecord(state.databaseName, data);
        return {
          success: true,
          errors: []
        };
      } else {
        const spec = await fileSystem.loadSpec();
        const database = spec.databases[state.databaseName];
        if (!database) {
          return {
            success: false,
            errors: [{
              message: `Database "${state.databaseName}" not found`,
              severity: 'error' as const
            }]
          };
        }
        
        if (!Array.isArray(data)) {
          return {
            success: false,
            errors: [{
              message: 'Records must be an array',
              severity: 'error' as const
            }]
          };
        }
        
        // Collect all validation errors instead of stopping at first error
        const allErrors: ValidationError[] = [];
        data.forEach((record: Record, index: number) => {
          const errors = validateRecord(spec, record, database);
          errors.forEach(msg => {
            allErrors.push({
              message: `Record at index ${index}: ${msg}`,
              severity: 'error' as const
            });
          });
        });
        
        if (allErrors.length > 0) {
          return {
            success: false,
            errors: allErrors
          };
        }
        
        await fileSystem.saveDatabase(state.databaseName, data);
        return {
          success: true,
          errors: []
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: `Save error: ${(error as Error).message}`,
          severity: 'error' as const
        }]
      };
    }
  }

  async createNewRecord(databaseName: string): Promise<void> {
    await fileSystem.createNewRecord(databaseName);
  }

  async deleteRecord(databaseName: string, recordId: string): Promise<void> {
    await fileSystem.deleteRecord(databaseName, recordId);
  }

  async getValidationErrors(content: string, state: EditorState): Promise<ValidationError[]> {
    try {
      const data = parseYaml(content);
      
      if (!state.databaseName || !state.recordId) {
        return [];
      }
      
      const spec = await fileSystem.loadSpec();
      const database = spec.databases[state.databaseName];
      if (database) {
        const errors = validateRecord(spec, data, database).map(msg => ({
          message: msg,
          severity: 'error' as const
        }));
        return errors;
      }
      
      return [];
    } catch {
      return [{
        message: 'Invalid JSON/YAML syntax',
        severity: 'error' as const
      }];
    }
  }

  formatContent(content: string): string {
    try {
      const data = parseYaml(content);
      return stringifyYaml(data);
    } catch {
      return content;
    }
  }
}

export const recordEditorService = new RecordEditorService();