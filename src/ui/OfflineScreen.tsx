import React from 'react';
import { WifiOffIcon } from './Icons';

const OfflineScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-primary-bg dark:bg-dark-primary-bg flex flex-col items-center justify-center text-center p-6 login-bg-pattern">
            <div className="bg-secondary-bg dark:bg-dark-secondary-bg p-8 rounded-2xl shadow-xl border border-border-color dark:border-dark-border-color max-w-md w-full">
                <WifiOffIcon className="h-20 w-20 text-red-500 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-primary-text dark:text-dark-primary-text">No Internet Connection</h1>
                <p className="mt-4 text-secondary-text dark:text-dark-secondary-text">
                    This application requires an active internet connection. Please turn on your Wi-Fi or cellular data to continue.
                </p>
                <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">The page will automatically reload once a connection is established.</p>
            </div>
        </div>
    );
};

export default OfflineScreen;
