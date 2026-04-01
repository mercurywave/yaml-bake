import React, { useState, useEffect } from 'react';
import { fileSystem } from './fileSystem';
import { EditorService } from './editorService';
import { Spec, DatabaseDef, FieldDef, Record, EditorState, EditorData } from './types';
import MonacoEditor from '@monaco-editor/react';
import { parseYaml } from './utils';
import { generateDisplayName } from './dataValidator';
import LeftPane from './LeftPane';
import RightPane from './RightPane';
import ToastManager from './ToastManager';
import './specEditorService';
import './recordEditorService';

const editorService = new EditorService();

interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
  line?: number;
}

function App() {
  const [folderSelected, setFolderSelected] = useState(false);
  const [editorState, setEditorState] = useState<EditorState>({ mode: 'spec', displayName: 'spec' });
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [databaseList, setDatabaseList] = useState<{ name: string; count: number; hasErrors: boolean }[]>([]);
  const [recordList, setRecordList] = useState<{ id: string; warning: boolean; error: boolean }[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectFolder = async () => {
    const success = await fileSystem.selectFolder();
    if (success) {
      setFolderSelected(true);
      await loadEditorData({ mode: 'spec', displayName: 'spec' });
    }
  };

  const loadEditorData = async (state: EditorState) => {
    setIsLoading(true);
    try {
      const data = await editorService.loadEditorData(state);
      setEditorData(data);
      setEditorContent(data.content);
      setValidationErrors(data.validationErrors.map(e => ({ message: e.message, severity: e.severity })));
      const databases = await fileSystem.loadAllDatabases();
      
      if (state.mode === 'spec') {
        // Handle object database structure
        
        setDatabaseList(Object.keys(databases).map(key => ({
          name: key,
          count: databases[key].length,
          hasErrors: false
        })));
        setRecordList([]);
        setSelectedDatabase(null);
        setSelectedRecordId(null);
      } else if (state.databaseName) {
        setSelectedDatabase(state.databaseName);
        setDatabaseList(Object.keys(databases).map(k => ({
          name: k,
          count: databases[k].length,
          hasErrors: data.validationErrors.length > 0
        })));
        
        if (state.recordId) {
          setSelectedRecordId(state.recordId);
        } else {
          // Load records for this database
          const records = await fileSystem.loadDatabase(state.databaseName);
          const spec = await fileSystem.loadSpec();
          const database = spec.databases[state.databaseName];
          
          setRecordList(records.map(record => ({
            id: record.id || '',
            warning: false,
            error: false,
            displayName: database ? generateDisplayName(record, database) : record.id || ''
          })));
        }
      }
      setEditorState(state);
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
      let result = await editorService.trySaveEditorData(editorState, editorContent);
      setValidationErrors(result.errors);
      if(result.noChange){
        return;
      }
      if(result.success){
        (window as any).addToast(`Saved ${editorState.displayName}!`, 'success');
      } else {
        // If save failed due to validation errors, prompt user to force save
        if (result.errors.length > 0) {
          // Add a small delay to allow errors to be displayed before showing confirmation
          setTimeout(() => {
            const shouldForceSave = window.confirm('Some validations failed. Do you want to force save anyway?');
            if (shouldForceSave) {
              editorService.forceSaveEditorData(editorState, editorContent).then(forceResult => {
                if(forceResult.success){
                  (window as any).addToast(`Force saved ${editorState.displayName}!`, 'success');
                }
              });
            }
          }, 100);
        }
      }
    } catch (error) {
      setValidationErrors([{ message: (error as Error).message, severity: 'error' }]);
    }
  };

  const handleDatabaseSelect = async (databaseName: string) => {
    // Save current editor data before switching
    if (editorState.mode && editorData && editorContent) {
      try {
        await handleSave();
      } catch (error) {
        console.error('Save failed before database switch:', error);
      }
    }
    
    setSelectedDatabase(databaseName);
    setSelectedRecordId(null);
    await loadEditorData({ mode: 'record', displayName: databaseName, databaseName });
  };

  const handleRecordSelect = async (recordId: string) => {
    // Save current editor data before switching
    if (editorState.mode && editorData && editorContent) {
      try {
        await handleSave();
      } catch (error) {
        console.error('Save failed before record switch:', error);
      }
    }
    
    setSelectedRecordId(recordId);
    const db = await fileSystem.loadDatabase(selectedDatabase!);
    const dbDef = (await fileSystem.loadSpec()).databases[selectedDatabase!];
    let record = db.find(r => r.id === recordId);
    if (selectedDatabase) {
      await loadEditorData({
        mode: 'record',
        displayName: `${selectedDatabase} - ${(record ? generateDisplayName(record, dbDef) : '???')}`,
        databaseName: selectedDatabase,
        recordId });
    }
  };

  const handleSpecEdit = async () => {
    // Save current editor data before switching
    if (editorState.mode && editorData && editorContent) {
      try {
        await handleSave();
      } catch (error) {
        console.error('Save failed before spec switch:', error);
      }
    }
    
    await loadEditorData({ mode: 'spec', displayName: 'spec' });
  };

  const handleCreateRecord = async () => {
    if (selectedDatabase) {
      await editorService.createNewRecord(selectedDatabase);
      await loadEditorData({ mode: 'record', displayName: '[new record]', databaseName: selectedDatabase });
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (selectedDatabase && confirm('Delete this record?')) {
      await editorService.deleteRecord(selectedDatabase, recordId);
      await loadEditorData({ mode: 'record', displayName: selectedDatabase, databaseName: selectedDatabase });
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
        const databases = await fileSystem.loadAllDatabases();
        setDatabaseList(Object.keys(databases).map(k => ({
          name: k,
          count: databases[k].length,
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
          handleCreateRecord={handleCreateRecord}
          handleDeleteRecord={handleDeleteRecord}
          handleSpecEdit={handleSpecEdit}
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
      <ToastManager />
    </div>
  );
}

export default App;