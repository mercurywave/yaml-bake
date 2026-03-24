import React, { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastClass = () => {
    switch (type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'warning': return 'toast-warning';
      case 'info': return 'toast-info';
      default: return 'toast-info';
    }
  };

  return (
    <div className={`toast ${getToastClass()}`}>
      <span>{message}</span>
    </div>
  );
};

interface ToastManagerState {
  toasts: { id: number; message: string; type: 'success' | 'error' | 'warning' | 'info' }[];
}

const ToastManager: React.FC<{  }> = ({}) => {
  const [state, setState] = useState<ToastManagerState>({ toasts: [] });

  const onRemoveToast = (id: number) => {
    setState({
      toasts: state.toasts.filter(t => t.id !== id)
    });
  };

  const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now();
    setState(prev => ({
      toasts: [...prev.toasts, { id, message, type }]
    }));
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      onRemoveToast(id);
    }, 3000);
  };

  // Add addToast to global scope
  (window as any).addToast = addToast;

  return (
    <div className="toast-container">
      {state.toasts.map(toast => (
        <Toast 
          key={toast.id} 
          message={toast.message} 
          type={toast.type} 
          onClose={() => onRemoveToast(toast.id)} 
        />
      ))}
    </div>
  );
};

export default ToastManager;