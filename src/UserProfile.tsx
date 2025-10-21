import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Card from './ui/Card';
import { Spinner } from './ui/Spinner';
import { ArrowRightOnRectangleIcon, EnvelopeIcon, UserIcon, ShieldCheckIcon, LockClosedIcon, BellIcon } from './ui/Icons';

const DetailItem: React.FC<{ icon: React.FC<any>, label: string, value: string }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center">
        <Icon className="h-5 w-5 text-secondary-text dark:text-dark-secondary-text" />
        <div className="ml-3">
            <dt className="text-sm text-secondary-text dark:text-dark-secondary-text">{label}</dt>
            <dd className="font-semibold text-primary-text dark:text-dark-primary-text">{value}</dd>
        </div>
    </div>
);


const UserProfile: React.FC = () => {
    const { user, logout, isLoading } = useAuth();

    if (isLoading) {
        return (
            <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex justify-center items-center h-full">
                <Spinner />
            </main>
        );
    }

    if (!user) {
        return (
             <main className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <motion.div
                    className="max-w-3xl mx-auto"
                >
                    <Card className="p-8 text-center">
                        <p>No user is currently logged in.</p>
                    </Card>
                </motion.div>
             </main>
        );
    }

    const userAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=96&font-size=0.4`;

    return (
        <main className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 h-full">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto"
            >
                <Card>
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col items-center sm:flex-row sm:items-center sm:space-x-6">
                            <img
                                className="h-24 w-24 rounded-full"
                                src={userAvatarUrl}
                                alt={`${user.name}'s avatar`}
                            />
                            <div className="mt-4 sm:mt-0 text-center sm:text-left">
                                <h1 className="text-3xl font-bold text-primary-text dark:text-dark-primary-text">{user.name}</h1>
                                <p className="text-sm text-secondary-text dark:text-dark-secondary-text mt-1">Welcome to your personal dashboard space.</p>
                            </div>
                        </div>

                        <div className="mt-8 border-t border-border-color dark:border-dark-border-color pt-6">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text mb-4">User Information</h2>
                            <dl className="space-y-4">
                                <DetailItem icon={UserIcon} label="Full Name" value={user.name} />
                                <DetailItem icon={EnvelopeIcon} label="Email Address" value={user.email} />
                                <DetailItem icon={ShieldCheckIcon} label="Role" value={user.role} />
                            </dl>
                        </div>
                        
                         <div className="mt-8 border-t border-border-color dark:border-dark-border-color pt-6">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-secondary-text dark:text-dark-secondary-text mb-4">Account Actions</h2>
                            <div className="space-y-3">
                                 <button
                                    onClick={() => alert('Password change functionality is not yet implemented.')}
                                    className="w-full flex items-center text-left p-3 rounded-lg transition-colors text-primary-text dark:text-dark-primary-text hover:bg-highlight-hover dark:hover:bg-dark-highlight-hover"
                                >
                                    <LockClosedIcon className="h-5 w-5 mr-3 text-secondary-text dark:text-dark-secondary-text" />
                                    <span>Change Password</span>
                                </button>
                                 <button
                                    disabled
                                    className="w-full flex items-center text-left p-3 rounded-lg transition-colors text-primary-text dark:text-dark-primary-text opacity-50 cursor-not-allowed"
                                >
                                    <BellIcon className="h-5 w-5 mr-3 text-secondary-text dark:text-dark-secondary-text" />
                                    <span>Manage Notifications</span>
                                </button>
                            </div>
                        </div>


                        <div className="mt-8 border-t border-border-color dark:border-dark-border-color pt-6">
                            <motion.button
                                onClick={logout}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                                Log Out
                            </motion.button>
                        </div>
                    </div>
                </Card>
            </motion.div>
        </main>
    );
};

export default UserProfile;
