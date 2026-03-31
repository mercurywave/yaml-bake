import { Spec, DatabaseDef, Record, EditorState, SaveResult } from './types';
import { fileSystem } from './fileSystem';
import { parseYaml, stringifyYaml } from './yamlUtils';
import { validateSpec } from './specValidator';

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

export class SpecEditorService {
  async loadEditorData(state: EditorState): Promise<EditorData> {
    const spec = await fileSystem.loadSpec();
    
    // For spec editing, we show the raw spec without UUIDs
    const specErrors = validateSpec(spec).map(msg => ({
      message: msg,
      severity: 'error' as const
    }));
    
    return {
      content: spec.rawSpec,
      spec,
      validationErrors: specErrors
    };
  }

  async trySaveEditorData(state: EditorState, content: string): Promise<SaveResult> {
    try {
      const data = parseYaml(content);
      
      const errors = validateSpec(data);
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
      
      await fileSystem.saveSpec(content);
      return {
        success: true,
        errors: []
      };
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

  async getValidationErrors(content: string, state: EditorState): Promise<ValidationError[]> {
    try {
      const data = parseYaml(content);
      
      const errors = validateSpec(data).map(msg => ({
        message: msg,
        severity: 'error' as const
      }));
      return errors;
    } catch {
      return [{
        message: 'Invalid JSON/YAML syntax',
        severity: 'error' as const
      }];
    }
  }
}

export const specEditorService = new SpecEditorService();