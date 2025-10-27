
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ExclamationTriangleIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, ChevronLeftIcon } from '../ui/Icons';
import { motion, AnimatePresence, HTMLMotionProps } from 'framer-motion';

// Add google to the window interface for Google Identity Services client
declare global {
    interface Window {
        google: any;
    }
}

const FloatingElement: React.FC<HTMLMotionProps<'div'>> = ({ className, children, ...rest }) => (
    <motion.div
        className={`absolute bg-white/10 backdrop-blur-md rounded-lg border border-white/20 shadow-xl ${className || ''}`}
        {...rest}
    >
        {children}
    </motion.div>
);

const formVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

interface LoginFormProps {
    onForgotPassword: () => void;
    triggerShake: () => void;
    direction: number;
}

const LoginForm: React.FC<LoginFormProps> = ({ onForgotPassword, triggerShake, direction }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login, error: authError, loginWithGoogle } = useAuth();

    const handleGoogleSignIn = (response: any) => {
        loginWithGoogle(response.credential);
    };

    useEffect(() => {
        if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: '865204501855-ps4kq2cue9fc1q661jeci08qg1huti20.apps.googleusercontent.com',
                callback: handleGoogleSignIn,
            });
            const googleButtonContainer = document.getElementById('google-signin-button');
            if (googleButtonContainer) {
                 window.google.accounts.id.renderButton(
                    googleButtonContainer,
                    { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with', width: '336' }
                );
            }
        }
    }, [loginWithGoogle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };

    const isSubmitDisabled = isLoading || !email || !password;

    return (
        <motion.div
            key="login"
            custom={direction}
            variants={formVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
        >
            <div className="text-center lg:text-left mb-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary-text dark:text-dark-primary-text">Welcome back!</h1>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-2">Sign in to your Lenovo AI-powered dashboard.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="sr-only">Email Address</label>
                    <div className="relative">
                        <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="block w-full rounded-lg border border-border-color dark:border-dark-border-color bg-primary-bg dark:bg-dark-primary-bg py-3 pl-12 pr-4 text-primary-text dark:text-dark-primary-text shadow-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <div className="relative">
                        <LockClosedIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="block w-full rounded-lg border border-border-color dark:border-dark-border-color bg-primary-bg dark:bg-dark-primary-bg py-3 pl-12 pr-12 text-primary-text dark:text-dark-primary-text shadow-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-0 top-0 bottom-0 px-4 flex items-center text-gray-400 hover:text-primary-text dark:hover:text-dark-primary-text"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
                
                <div className="text-right">
                    <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-highlight hover:underline">
                        Forgot password?
                    </button>
                </div>

                <AnimatePresence>
                    {(error || authError) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                            className="flex items-start bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-sm"
                        >
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                            <span>{error || authError}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div>
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white btn-gradient focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-highlight disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </div>
            </form>
            
            <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border-color dark:border-dark-border-color" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-secondary-bg dark:bg-dark-secondary-bg text-secondary-text dark:text-dark-secondary-text">OR</span>
                </div>
            </div>

            <div className="mt-6 flex justify-center">
                 <div id="google-signin-button"></div>
            </div>
        </motion.div>
    );
};

interface ForgotPasswordFormProps {
    onBackToLogin: () => void;
    direction: number;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin, direction }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { requestPasswordReset } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError(null);
        try {
            await requestPasswordReset(email);
            setMessage('If an account with that email exists, a password reset link has been sent.');
        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            key="forgot-password"
            custom={direction}
            variants={formVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
        >
            <div className="text-center lg:text-left mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-primary-text dark:text-dark-primary-text">Reset Password</h1>
                <p className="text-secondary-text dark:text-dark-secondary-text mt-1">Enter your email to receive a reset link.</p>
            </div>

            <AnimatePresence>
                 {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="flex items-start bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-md text-sm"
                    >
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="flex items-start bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-md text-sm"
                        aria-live="polite"
                    >
                       <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                       <span>{message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                 <div>
                    <label htmlFor="reset-email" className="sr-only">Email Address</label>
                    <div className="relative">
                        <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            id="reset-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="block w-full rounded-lg border border-border-color dark:border-dark-border-color bg-primary-bg dark:bg-dark-primary-bg py-3 pl-12 pr-4 text-primary-text dark:text-dark-primary-text shadow-sm focus:outline-none focus:ring-2 focus:ring-highlight"
                        />
                    </div>
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white btn-gradient focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-highlight disabled:opacity-50 disabled:cursor-wait"
                    >
                        {isLoading ? (
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Send Reset Link'}
                    </button>
                </div>
            </form>
            <div className="mt-6 text-center">
                <button onClick={onBackToLogin} className="text-sm font-medium text-highlight hover:underline flex items-center justify-center w-full">
                    <ChevronLeftIcon className="h-4 w-4 mr-1" />
                    Back to Sign In
                </button>
            </div>
        </motion.div>
    );
};


const Login: React.FC = () => {
    const [view, setView] = useState<'login' | 'forgot-password'>('login');
    const [direction, setDirection] = useState(0);
    const [shakeForm, setShakeForm] = useState(false);

    const showForgotPassword = () => {
        setDirection(1);
        setView('forgot-password');
    };

    const showLogin = () => {
        setDirection(-1);
        setView('login');
    };
    
    const triggerShake = () => {
        setShakeForm(true);
        setTimeout(() => setShakeForm(false), 820);
    };
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            <div className="hidden lg:flex flex-col items-center justify-center p-12 text-center text-white auth-grid-bg relative overflow-hidden">
                <motion.div
                    className="relative z-10"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.img src="https://i.postimg.cc/85tScvnw/Limperial-Technology-Logo01-png-004aad.png" alt="Limperial Technology Logo" className="max-w-[250px] h-auto mx-auto mb-6 logo-white" variants={itemVariants} />
                    <motion.h2 className="text-3xl font-bold tracking-tight" variants={itemVariants}>Business Intelligence.</motion.h2>
                    <motion.p className="mt-3 max-w-md mx-auto text-lg text-white/80" variants={itemVariants}>
                        Access real-time data.
                    </motion.p>
                </motion.div>
                
                <FloatingElement
                    className="top-[15%] left-[10%] w-48 h-28 p-3"
                    animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                    <div className="w-full h-full flex items-end gap-1.5">
                        <div className="w-1/4 h-1/3 bg-white/50 rounded-t-sm"></div>
                        <div className="w-1/4 h-2/3 bg-white/50 rounded-t-sm"></div>
                        <div className="w-1/4 h-1/2 bg-white/50 rounded-t-sm"></div>
                        <div className="w-1/4 h-3/4 bg-white/50 rounded-t-sm"></div>
                    </div>
                </FloatingElement>
                
                <FloatingElement
                    className="bottom-[20%] right-[15%] w-56 h-36 p-4"
                    animate={{ y: [0, 12, 0], x: [0, -6, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <div className="w-1/3 h-4 bg-white/50 rounded-sm mb-2.5"></div>
                    <div className="w-1/2 h-8 bg-white/50 rounded-sm mb-3"></div>
                    <div className="w-full h-3 bg-white/30 rounded-sm mb-2"></div>
                    <div className="w-3/4 h-3 bg-white/30 rounded-sm"></div>
                </FloatingElement>

                <FloatingElement
                    className="top-[25%] right-[25%] w-24 h-24 p-2"
                     animate={{ rotate: 360 }}
                     transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                >
                    <div className="w-full h-full rounded-full border-2 border-white/50 flex items-center justify-center">
                        <div className="w-3/4 h-3/4 bg-white/20 rounded-full"></div>
                    </div>
                </FloatingElement>
                
                <FloatingElement
                    className="bottom-[10%] left-[20%] w-32 h-16"
                    animate={{ y: [0, 8, 0], x: [0, 4, 0] }}
                    transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                />
            </div>
            <div className="flex items-center justify-center p-6 min-h-screen login-bg-pattern">
                <motion.div
                    className={`w-full max-w-md bg-secondary-bg dark:bg-dark-secondary-bg rounded-2xl shadow-xl p-8 lg:p-12 border border-border-color dark:border-dark-border-color ${shakeForm ? 'shake' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                    <AnimatePresence initial={false} custom={direction}>
                        {view === 'login' ? (
                            <LoginForm onForgotPassword={showForgotPassword} triggerShake={triggerShake} direction={direction} />
                        ) : (
                            <ForgotPasswordForm onBackToLogin={showLogin} direction={direction} />
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;