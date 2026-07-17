import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Custom-styled toast notification provider using react-hot-toast.
 */
export const Toast = () => {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#FFFFFF',
          color: '#1E293B',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          padding: '12px 16px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        },
        success: {
          iconTheme: {
            primary: '#16A34A',
            secondary: '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FFFFFF',
          },
        },
        loading: {
          style: {
            background: '#F8FAFC',
          }
        }
      }}
    />
  );
};

export default Toast;
