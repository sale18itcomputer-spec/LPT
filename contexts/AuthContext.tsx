import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import type { AuthUser } from '../types';
import { getAuthData } from '../services/googleScriptService';

interface GoogleUserPayload {
  email: string;
  name: string;
  picture: string;
  // Other fields like sub, iss, aud, etc., can be added if needed
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    requestPasswordReset: (email: string) => Promise<void>;
    loginWithGoogle: (credential: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'lenovo-dashboard-user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authData, setAuthData] = useState<(AuthUser & { password: string })[]>([]);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Check for a logged-in user in session storage first for a quick UI update
                const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }

                // Then, fetch the full authentication data from the sheet
                const data = await getAuthData();
                setAuthData(data);
            } catch (e) {
                console.error("Auth initialization failed:", e);
                setError(e instanceof Error ? e.message : "Could not initialize authentication. Please check your connection.");
                // Clear potentially corrupt session data and log user out
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, []);


    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        if (authData.length === 0) {
            setError("Authentication service is not available. Please try again later.");
            return;
        }

        const foundUser = authData.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (foundUser) {
            const userToStore: AuthUser = { name: foundUser.name, email: foundUser.email, role: foundUser.role };
            setUser(userToStore);
            try {
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userToStore));
            } catch (e) {
                console.error("Failed to save user to session storage", e);
            }
        } else {
            throw new Error("Invalid email or password.");
        }
    }, [authData]);

    const logout = useCallback(() => {
        setUser(null);
        try {
            // Clear the user's session.
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch (e) {
            console.error("Failed to clear user session storage", e);
        } finally {
            // Force a full page reload to reset all application state (React state, contexts, etc.).
            // This is the most robust way to ensure a clean slate for the next login.
            window.location.reload();
        }
    }, []);

    const requestPasswordReset = useCallback(async (email: string) => {
        setError(null);
        if (authData.length === 0) {
            throw new Error("Authentication service is not available. Please try again later.");
        }

        const foundUser = authData.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (foundUser) {
            console.log(`SIMULATION: Password reset requested for existing user: ${email}. In a real app, an email would be sent.`);
        } else {
            console.log(`SIMULATION: Password reset requested for non-existent user: ${email}. No action taken, but returning success to the UI.`);
        }
        
        return Promise.resolve();

    }, [authData]);

    const loginWithGoogle = useCallback((credential: string) => {
        setError(null);
        try {
            // Decode the JWT payload. This is for client-side display purposes only.
            // In a real app, this token would be sent to a backend for verification.
            const payloadBase64 = credential.split('.')[1];
            const decodedPayload = atob(payloadBase64);
            const payload: GoogleUserPayload = JSON.parse(decodedPayload);
            
            const foundUser = authData.find(u => u.email.toLowerCase() === payload.email.toLowerCase());

            if (foundUser) {
                const userToStore: AuthUser = {
                    email: payload.email,
                    name: payload.name,
                    role: foundUser.role,
                };
    
                setUser(userToStore);
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userToStore));
            } else {
                setError("Your Google account is not authorized for this application.");
            }
        } catch (e) {
            console.error("Failed to process Google credential:", e);
            setError("Could not sign in with Google. Please try again.");
        }
    }, [authData]);


    const value = { user, isLoading, error, login, logout, requestPasswordReset, loginWithGoogle };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};