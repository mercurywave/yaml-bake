import { Spec, DatabaseDef, Record, EditorMode, EditorState } from './types';
import { parseYaml, stringifyYaml } from './yamlUtils';

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}

// Define types for File System Access API
interface FileSystemDirectoryHandle {
  name: string;
  kind: 'directory';
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string): Promise<void>;
}

interface FileSystemFileHandle {
  name: string;
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}

const SPEC_FILE = 'spec.yaml';

export class FileSystemService {
  public rootDir: FileSystemDirectoryHandle | null = null;
  private specCache: Spec | null = null;
  private databases: Map<string, Record[]> = new Map();
  private databaseCache: Map<string, string> = new Map();

  async selectFolder(): Promise<boolean> {
    try {
      const dir = await window.showDirectoryPicker();
      this.rootDir = dir;
      this.specCache = null;
      this.databases.clear();
      this.databaseCache.clear();
      return true;
    } catch (error) {
      console.error('Folder selection cancelled:', error);
      return false;
    }
  }

  async loadSpec(): Promise<Spec> {
    if (this.specCache) {
      return this.specCache;
    }

    if (!this.rootDir) {
      throw new Error('No folder selected');
    }

    try {
      const fileHandle = await this.rootDir.getFileHandle(SPEC_FILE);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const spec = parseYaml(content || '') as Spec;
      if (Object.keys(spec).length === 0) {
        throw new Error('Empty spec file');
      }
      this.specCache = spec;
      return spec;
    } catch (error) {
      throw new Error(`Failed to load spec.yaml: ${(error as Error).message}`);
    }
  }

  async loadDatabase(databaseName: string): Promise<Record[]> {
    const cached = this.databases.get(databaseName);
    if (cached) {
      return cached;
    }

    if (!this.rootDir) {
      throw new Error('No folder selected');
    }

    const fileName = `${databaseName}.yaml`;
    
    try {
      const fileHandle = await this.rootDir.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const records = parseYaml(content || '[]') as Record[];
      this.databases.set(databaseName, records);
      this.databaseCache.set(databaseName, content);
      return records;
    } catch (error) {
      if ((error as { name?: string }).name === 'NotFoundError') {
        const emptyRecords: Record[] = [];
        this.databases.set(databaseName, emptyRecords);
        this.databaseCache.set(databaseName, '[]');
        return emptyRecords;
      }
      throw new Error(`Failed to load ${fileName}: ${(error as Error).message}`);
    }
  }

  async saveSpec(spec: Spec): Promise<void> {
    if (!this.rootDir) {
      throw new Error('No folder selected');
    }

    const content = stringifyYaml(spec);
    
    try {
      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await this.rootDir.getFileHandle(SPEC_FILE);
      } catch {
        await this.rootDir.getFileHandle(SPEC_FILE, { create: true });
        fileHandle = await this.rootDir.getFileHandle(SPEC_FILE);
      }
      
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      this.specCache = spec;
    } catch (error) {
      throw new Error(`Failed to save spec.yaml: ${(error as Error).message}`);
    }
  }

  async saveDatabase(databaseName: string, records: Record[]): Promise<void> {
    if (!this.rootDir) {
      throw new Error('No folder selected');
    }

    const content = stringifyYaml(records);
    const fileName = `${databaseName}.yaml`;
    
    try {
      let fileHandle: FileSystemFileHandle;
      try {
        fileHandle = await this.rootDir.getFileHandle(fileName);
      } catch {
        await this.rootDir.getFileHandle(fileName, { create: true });
        fileHandle = await this.rootDir.getFileHandle(fileName);
      }
      
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      this.databases.set(databaseName, records);
      this.databaseCache.set(databaseName, content);
    } catch (error) {
      throw new Error(`Failed to save ${fileName}: ${(error as Error).message}`);
    }
  }

  async createDatabase(databaseName: string, fields: any[]): Promise<void> {
    if (!this.rootDir) {
      throw new Error('No folder selected');
    }

    const spec = await this.loadSpec();
    
    const newDatabase: any = {
      name: databaseName,
      fields
    };
    
    spec.databases.push(newDatabase);
    await this.saveSpec(spec);
    
    const records: Record[] = [];
    this.databases.set(databaseName, records);
    
    const content = JSON.stringify(records, null, 2);
    const fileName = `${databaseName}.yaml`;
    
    await this.rootDir.getFileHandle(fileName, { create: true });
  }

  async deleteDatabase(databaseName: string): Promise<void> {
    if (!this.rootDir) {
      throw new Error('No folder selected');
    }

    const spec = await this.loadSpec();
    spec.databases = spec.databases.filter(db => db.name !== databaseName);
    await this.saveSpec(spec);
    
    this.databases.delete(databaseName);
    this.databaseCache.delete(databaseName);
    
    try {
      await this.rootDir.removeEntry(`${databaseName}.yaml`);
    } catch {
      // File might not exist
    }
  }

  async createNewRecord(databaseName: string): Promise<Record> {
    const spec = await this.loadSpec();
    const database = spec.databases.find(db => db.name === databaseName);
    
    if (!database) {
      throw new Error(`Database "${databaseName}" not found`);
    }

    const record: Record = { id: crypto.randomUUID() };
    
    database.fields.forEach(field => {
      if (field.optional) {
        return;
      }
      
      switch (field.type) {
        case 'string':
          record[field.name] = '';
          break;
        case 'number':
          record[field.name] = 0;
          break;
        case 'boolean':
          record[field.name] = false;
          break;
        case 'array':
          record[field.name] = [];
          break;
        case 'object':
          record[field.name] = {};
          break;
        case 'enum':
          if (field.options && field.options.length > 0) {
            record[field.name] = field.options[0];
          }
          break;
      }
    });
    
    const records = await this.loadDatabase(databaseName);
    records.push(record);
    await this.saveDatabase(databaseName, records);
    
    return record;
  }

  async deleteRecord(databaseName: string, recordId: string): Promise<void> {
    const records = await this.loadDatabase(databaseName);
    const index = records.findIndex(r => r.id === recordId);
    
    if (index !== -1) {
      records.splice(index, 1);
      await this.saveDatabase(databaseName, records);
    }
  }

  async updateRecord(databaseName: string, record: Record): Promise<void> {
    const records = await this.loadDatabase(databaseName);
    const index = records.findIndex(r => r.id === record.id);
    
    if (index !== -1) {
      records[index] = record;
      await this.saveDatabase(databaseName, records);
    }
  }

  getSelectedMode(state: EditorState): EditorMode {
    if (!state.databaseName) {
      return 'spec';
    }
    return 'record';
  }

  async refreshAll(): Promise<void> {
    this.specCache = null;
    this.databases.clear();
    this.databaseCache.clear();
  }
}

export const fileSystem = new FileSystemService();