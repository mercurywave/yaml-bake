import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fileSystem } from './fileSystem';
import { EditorData, EditorService } from './editorService';
import { Spec, DatabaseDef, FieldDef, Record, EditorState } from './types';
import MonacoEditor from '@monaco-editor/react';
import { parseYaml } from './yamlUtils';
import LeftPane from './LeftPane';
import RightPane from './RightPane';

const editorService = new EditorService();

interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  line?: number;
}

function App() {
  const [folderSelected, setFolderSelected] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({ mode: 'spec' });
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [databaseList, setDatabaseList] = useState<{ name: string; count: number; hasErrors: boolean }[]>([]);
  const [recordList, setRecordList] = useState<{ id: string; warning: boolean; error: boolean }[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectFolder = async () => {
    const success = await fileSystem.selectFolder();
    if (success) {
      setFolderSelected(true);
      await loadEditorData({ mode: 'spec' });
    }
  };

  const loadEditorData = async (state: EditorState) => {
    setIsLoading(true);
    try {
      const data = await editorService.loadEditorData(state);
      setEditorData(data);
      setEditorContent(data.content);
      setValidationErrors(data.validationErrors.map(e => ({ message: e.message, severity: e.severity })));
      
      if (state.mode === 'spec') {
        // Handle object database structure
        const databases: { [key: string]: DatabaseDef } = data.spec?.databases ?? {};
        
        setDatabaseList(Object.keys(databases).map(key => ({
          name: key,
          count: 0,
          hasErrors: false
        })));
        setRecordList([]);
        setSelectedDatabase(null);
        setSelectedRecordId(null);
      } else if (state.databaseName) {
        setSelectedDatabase(state.databaseName);
        const databases: { [key: string]: DatabaseDef } = data.spec?.databases ?? {};
        setDatabaseList(Object.keys(databases).map(k => ({
          name: k,
          count: k === state.databaseName ? (Array.isArray(parseYaml(data.content || '[]')) ? parseYaml(data.content || '[]').length : 0) : 0,
          hasErrors: data.validationErrors.length > 0
        })));
        
        if (state.recordId) {
          setSelectedRecordId(state.recordId);
        } else {
          // Load records for this database
          const records = await fileSystem.loadDatabase(state.databaseName);
          setRecordList(records.map(record => ({
            id: record.id || '',
            warning: false,
            error: false
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setValidationErrors([{ message: (error as Error).message, severity: 'error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editorState.mode || !editorData) return;
    
    try {
      await editorService.saveEditorData(editorState, editorContent);
      setValidationErrors([]);
      alert('Saved successfully!');
    } catch (error) {
      setValidationErrors([{ message: (error as Error).message, severity: 'error' }]);
    }
  };

  const handleDatabaseSelect = async (databaseName: string) => {
    setSelectedDatabase(databaseName);
    setSelectedRecordId(null);
    await loadEditorData({ mode: 'record', databaseName });
  };

  const handleRecordSelect = async (recordId: string) => {
    setSelectedRecordId(recordId);
    if (selectedDatabase) {
      await loadEditorData({ mode: 'record', databaseName: selectedDatabase, recordId });
    }
  };

  const handleCreateDatabase = async () => {
    const name = prompt('Enter database name:');
    if (name) {
      const fields: FieldDef[] = [
        { type: 'uuid', required: true },
        { type: 'string', required: true }
      ];
      await editorService.createNewDatabase(name, fields);
      await loadEditorData({ mode: 'spec' });
    }
  };

  const handleCreateRecord = async () => {
    if (selectedDatabase) {
      await editorService.createNewRecord(selectedDatabase);
      await loadEditorData({ mode: 'record', databaseName: selectedDatabase });
    }
  };

  const handleDeleteDatabase = async (databaseName: string) => {
    if (confirm(`Delete database "${databaseName}"?`)) {
      await editorService.deleteDatabase(databaseName);
      await loadEditorData({ mode: 'spec' });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (selectedDatabase && confirm('Delete this record?')) {
      await editorService.deleteRecord(selectedDatabase, recordId);
      await loadEditorData({ mode: 'record', databaseName: selectedDatabase });
    }
  };

  const handleFormat = () => {
    if (editorContent) {
      const formatted = editorService.formatContent(editorContent);
      setEditorContent(formatted);
    }
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const spec = await fileSystem.loadSpec();
        // Handle object database structure
        const databases: { [key: string]: DatabaseDef } = spec?.databases ?? {};
        setDatabaseList(Object.keys(databases).map(k => ({
          name: k,
          count: 0,
          hasErrors: false
        })));
      } catch {
        // No spec file yet
      }
    };
    loadInitial();
  }, []);

  return (
    <div className="app">
      <div className="main-container">
        <LeftPane
          folderSelected={folderSelected}
          databaseList={databaseList}
          recordList={recordList}
          selectedDatabase={selectedDatabase}
          selectedRecordId={selectedRecordId}
          fileSystem={fileSystem}
          handleSelectFolder={handleSelectFolder}
          handleDatabaseSelect={handleDatabaseSelect}
          handleRecordSelect={handleRecordSelect}
          handleCreateDatabase={handleCreateDatabase}
          handleCreateRecord={handleCreateRecord}
          handleDeleteDatabase={handleDeleteDatabase}
          handleDeleteRecord={handleDeleteRecord}
        />
        
        <RightPane
          editorState={editorState}
          editorContent={editorContent}
          validationErrors={validationErrors}
          selectedDatabase={selectedDatabase}
          selectedRecordId={selectedRecordId}
          isLoading={isLoading}
          handleFormat={handleFormat}
          handleSave={handleSave}
          handleCreateRecord={handleCreateRecord}
          handleDeleteRecord={handleDeleteRecord}
          setEditorContent={setEditorContent}
          editorData={editorData}
          getValidationErrors={editorService.getValidationErrors}
        />
      </div>
    </div>
  );
}

export default App;