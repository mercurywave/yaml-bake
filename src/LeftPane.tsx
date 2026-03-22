import React from 'react';
import { DatabaseDef } from './types';

interface LeftPaneProps {
  folderSelected: boolean;
  databaseList: { name: string; count: number; hasErrors: boolean }[];
  recordList: { id: string; warning: boolean; error: boolean }[];
  selectedDatabase: string | null;
  selectedRecordId: string | null;
  fileSystem: any;
  handleSelectFolder: () => void;
  handleDatabaseSelect: (databaseName: string) => void;
  handleRecordSelect: (recordId: string) => void;
  handleCreateDatabase: () => void;
  handleCreateRecord: () => void;
  handleDeleteDatabase: (databaseName: string) => void;
  handleDeleteRecord: (recordId: string) => void;
}

const LeftPane: React.FC<LeftPaneProps> = ({
  folderSelected,
  databaseList,
  recordList,
  selectedDatabase,
  selectedRecordId,
  fileSystem,
  handleSelectFolder,
  handleDatabaseSelect,
  handleRecordSelect,
  handleCreateDatabase,
  handleCreateRecord,
  handleDeleteDatabase,
  handleDeleteRecord
}) => {
  return (
    <div className="left-pane">
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
      
      <div className="database-selector">
        <h3>Databases</h3>
        {folderSelected && (
          <div className="database-list">
            {databaseList.map((db) => (
              <div 
                key={db.name} 
                className={`database-item ${selectedDatabase === db.name ? 'active' : ''} ${db.hasErrors ? 'warning' : ''}`}
                onClick={() => handleDatabaseSelect(db.name)}
              >
                <span className="database-icon">📁</span>
                <span className="database-name">{db.name}</span>
                <span className="record-count">{db.count} records</span>
              </div>
            ))}
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: '8px', width: '100%' }}
              onClick={handleCreateDatabase}
            >
              + New Database
            </button>
          </div>
        )}
      </div>
      
      {selectedDatabase && (
        <div className="records-section">
          <div className="records-header">
            <h3>Records</h3>
            <button 
              className="btn btn-secondary" 
              onClick={handleCreateRecord}
              style={{ padding: '4px 8px', fontSize: '12px' }}
            >
              + New Record
            </button>
          </div>
          <div className="record-list">
            {recordList.length > 0 ? (
              recordList.map((record) => (
                <div 
                  key={record.id} 
                  className={`record-item ${selectedRecordId === record.id ? 'active' : ''}`}
                  onClick={() => handleRecordSelect(record.id)}
                >
                  <span className="record-icon">📄</span>
                  <span className="record-id">{record.id}</span>
                </div>
              ))
            ) : (
              <div className="no-records">No records found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftPane;