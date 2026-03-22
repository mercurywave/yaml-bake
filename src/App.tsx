import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fileSystem } from './fileSystem';
import { EditorData, EditorService } from './editorService';
import { Spec, DatabaseDef, FieldDef, Record, EditorState } from './types';

const editorService = new EditorService();

interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
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
        setDatabaseList(data.spec?.databases.map(db => ({
          name: db.name,
          count: 0,
          hasErrors: false
        })) || []);
        setRecordList([]);
        setSelectedDatabase(null);
        setSelectedRecordId(null);
      } else if (state.databaseName) {
        setSelectedDatabase(state.databaseName);
        const db = data.spec?.databases.find(d => d.name === state.databaseName);
        setDatabaseList(data.spec?.databases.map(d => ({
          name: d.name,
          count: d.name === state.databaseName ? (Array.isArray(JSON.parse(data.content || '[]')) ? JSON.parse(data.content || '[]').length : 0) : 0,
          hasErrors: data.validationErrors.length > 0
        })) || []);
        
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

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditorContent(e.target.value);
    
    if (editorData) {
      editorService.getValidationErrors(e.target.value, editorState).then(errors => {
        setValidationErrors(errors.map((e) => ({ message: e.message, severity: e.severity })));
      });
    }
  }, [editorContent, editorData, editorState]);

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

  const handleDatabaseClick = async (databaseName: string) => {
    setSelectedDatabase(databaseName);
    setSelectedRecordId(null);
    await loadEditorData({ mode: 'record', databaseName });
  };

  const handleRecordClick = async (recordId: string) => {
    setSelectedRecordId(recordId);
    if (selectedDatabase) {
      await loadEditorData({ mode: 'record', databaseName: selectedDatabase, recordId });
    }
  };

  const handleCreateDatabase = async () => {
    const name = prompt('Enter database name:');
    if (name) {
      const fields: FieldDef[] = [
        { name: 'id', type: 'uuid' },
        { name: 'name', type: 'string' }
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
        setDatabaseList(spec.databases.map(db => ({
          name: db.name,
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
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>YAML Bake</h1>
          {folderSelected ? (
            <div className="folder-path">
              {fileSystem.rootDir?.name || 'Selected folder'}
            </div>
          ) : (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '8px', width: '100%' }}
              onClick={handleSelectFolder}
            >
              Select Folder
            </button>
          )}
        </div>
        
        <div className="database-list">
          {folderSelected && (
            <>
              {databaseList.map((db) => (
                <div key={db.name} className="database">
                  <div 
                    className={`database-header ${selectedDatabase === db.name ? 'active' : ''} ${db.hasErrors ? 'warning' : ''}`}
                    onClick={() => handleDatabaseClick(db.name)}
                  >
                    <span className="database-icon">📁</span>
                    <span className="database-name">{db.name}</span>
                    <span className="record-count">{db.count} records</span>
                  </div>
                  
                  {selectedDatabase === db.name && recordList.length > 0 && (
                    <div className="record-list">
                      {recordList.map((record) => (
                        <div 
                          key={record.id} 
                          className={`record-item ${selectedRecordId === record.id ? 'active' : ''}`}
                          onClick={() => handleRecordClick(record.id)}
                        >
                          <span className="record-icon">📄</span>
                          <span className="record-id">{record.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <button 
                className="btn btn-secondary" 
                style={{ marginTop: '8px', width: '100%' }}
                onClick={handleCreateDatabase}
              >
                + New Database
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="main-content">
        <div className="toolbar">
          <h2>
            {editorState.mode === 'spec' 
              ? 'spec.yaml' 
              : `${selectedDatabase}${selectedRecordId ? ` - ${selectedRecordId}` : ''}`}
          </h2>
          
          <div className="toolbar-actions">
            <button 
              className="btn btn-secondary" 
              onClick={handleFormat}
              disabled={!folderSelected}
            >
              Format
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={!folderSelected}
            >
              Save
            </button>
            {selectedDatabase && !selectedRecordId && (
              <button 
                className="btn btn-secondary"
                onClick={handleCreateRecord}
              >
                + New Record
              </button>
            )}
            {selectedRecordId && (
              <button 
                className="btn btn-danger"
                onClick={() => handleDeleteRecord(selectedRecordId)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
        
        <div className="editor-container">
          <div className="editor-wrapper">
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p>Loading...</p>
              </div>
            ) : (
              <textarea
                ref={editorRef}
                className="editor"
                value={editorContent}
                onChange={handleContentChange}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
              />
            )}
          </div>
          
          <div className="error-panel">
            <h3>Validation</h3>
            {validationErrors.length === 0 ? (
              <p style={{ color: '#a6e3a1' }}>✓ No errors</p>
            ) : (
              <ul className="error-list">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className={`error-item ${err.severity}`}>
                    {err.severity === 'error' ? '✗' : '⚠'} {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;