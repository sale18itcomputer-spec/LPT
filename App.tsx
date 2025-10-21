
import React, { useEffect, useState } from 'react';
import Dashboard from './src/Dashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './src/auth/Login';
import { motion, AnimatePresence } from 'framer-motion';
import OfflineScreen from './src/ui/OfflineScreen';
import { TasksProvider } from './contexts/TasksContext';
import { ToastProvider } from './contexts/ToastContext';
import Toast from './src/ui/Toast';

const MotionDiv = motion.div;


const AppContent: React.FC = () => {
  const auth = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  useEffect(() => {
    const loaderElement = document.getElementById('loader');
    if (loaderElement && !auth.isLoading) {
      loaderElement.classList.add('hidden');
      setTimeout(() => {
        if (loaderElement) {
          loaderElement.style.display = 'none';
        }
      }, 500); // Corresponds to the transition duration in CSS
    }
  }, [auth.isLoading]);
  

  if (!isOnline) {
      return <OfflineScreen />;
  }


  if (auth.isLoading) {
    // The static loader from index.html is visible. Return null to avoid rendering anything from React yet.
    return null;
  }
  
  return (
    <>
      <Toast />
      <AnimatePresence mode="wait">
        {auth.user ? (
          <MotionDiv
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
              <div className="bg-primary-bg dark:bg-dark-primary-bg text-primary-text dark:text-dark-primary-text font-sans">
                <Dashboard />
              </div>
          </MotionDiv>
        ) : (
          <MotionDiv
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <Login />
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <TasksProvider>
              <AppContent />
            </TasksProvider>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;