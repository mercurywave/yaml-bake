import { EditorState } from './types';
import { specEditorService } from './specEditorService';
import { recordEditorService } from './recordEditorService';
import { parseYaml, stringifyYaml } from './yamlUtils';

export class EditorService {
  async loadEditorData(state: EditorState) {
    if (state.mode === 'spec') {
      return specEditorService.loadEditorData(state);
    } else {
      return recordEditorService.loadEditorData(state);
    }
  }

  async saveEditorData(state: EditorState, content: string) {
    if (state.mode === 'spec') {
      return specEditorService.saveEditorData(state, content);
    } else {
      return recordEditorService.saveEditorData(state, content);
    }
  }

  async createNewRecord(databaseName: string): Promise<void> {
    return recordEditorService.createNewRecord(databaseName);
  }

  async deleteRecord(databaseName: string, recordId: string): Promise<void> {
    return recordEditorService.deleteRecord(databaseName, recordId);
  }

  async getValidationErrors(content: string, state: EditorState) {
    if (state.mode === 'spec') {
      return specEditorService.getValidationErrors(content, state);
    } else {
      return recordEditorService.getValidationErrors(content, state);
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

export const editorService = new EditorService();