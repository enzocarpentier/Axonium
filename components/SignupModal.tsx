import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
    XIcon, 
    MailIcon, 
    KeyRoundIcon, 
    EyeIcon, 
    EyeOffIcon,
    UserIcon,
    CheckCircleIcon,
    AlertCircleIcon
} from './icons';
import ElegantSpinner from './spinners/ElegantSpinner';

interface SignupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignupSuccess: (user: any) => void;
    showNotification: (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ 
    isOpen, 
    onClose, 
    onSignupSuccess,
    showNotification 
}) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const validateForm = () => {
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
            setError('Veuillez remplir tous les champs');
            return false;
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Veuillez saisir une adresse email valide');
            return false;
        }

        return true;
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Créer le compte utilisateur
            const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
            const user = userCredential.user;

            // Mettre à jour le profil avec le nom complet
            await updateProfile(user, {
                displayName: `${firstName} ${lastName}`
            });

            // Créer le profil utilisateur dans Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                firstName: firstName,
                lastName: lastName,
                displayName: `${firstName} ${lastName}`,
                createdAt: new Date().toISOString(),
                emailVerified: false,
                hasSeenWelcomeNotification: false
            });

            // Créer les paramètres utilisateur par défaut
            await setDoc(doc(db, "userSettings", user.uid), {
                userId: user.uid,
                preferences: {
                    defaultGenerationType: 'qcm',
                    defaultNumQuestions: 5,
                    defaultDifficulty: 'Moyen',
                    defaultLanguage: 'fr',
                    theme: 'auto',
                    fontSize: 'medium',
                    compactMode: false,
                    emailNotifications: true,
                    pushNotifications: true,
                    notificationSound: true,
                    autoSave: true,
                    autoSaveInterval: 1,
                    exportFormat: 'pdf',
                    aiModel: 'gemini',
                    maxTokens: 2000,
                    temperature: 0.7
                },
                updatedAt: new Date().toISOString()
            });

            setSuccess(true);
            showNotification(
                'Inscription réussie',
                'Votre compte a été créé avec succès ! Bienvenue sur Axonium.',
                'success'
            );

            // Fermer le modal après un délai
            setTimeout(() => {
                onSignupSuccess(user);
                onClose();
                resetForm();
            }, 2000);

        } catch (error: any) {
            console.error('Erreur lors de l\'inscription:', error);
            
            let errorMessage = 'Une erreur est survenue lors de l\'inscription.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Un compte existe déjà avec cette adresse email.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Le mot de passe est trop faible.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'L\'adresse email n\'est pas valide.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'L\'inscription par email/mot de passe n\'est pas activée.';
                    break;
                default:
                    errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription.';
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setError(null);
        setSuccess(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Créer un compte
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Rejoignez Axonium
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {success ? (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Compte créé avec succès !
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                Votre compte a été créé et vous êtes maintenant connecté.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSignup} className="space-y-4">
                            {/* Prénom et Nom */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <UserIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Prénom"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                                    />
                                </div>
                                <div className="relative">
                                    <UserIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Nom"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="relative">
                                <MailIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                                <input
                                    type="email"
                                    placeholder="Adresse email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                                />
                            </div>

                            {/* Mot de passe */}
                            <div className="relative">
                                <KeyRoundIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mot de passe"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Confirmation du mot de passe */}
                            <div className="relative">
                                <KeyRoundIcon className="h-5 w-5 text-slate-400 absolute top-1/2 left-3 -translate-y-1/2" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirmer le mot de passe"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOffIcon className="h-4 w-4" />
                                    ) : (
                                        <EyeIcon className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Message d'erreur */}
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircleIcon className="h-4 w-4 text-red-500" />
                                        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                                    </div>
                                </div>
                            )}

                            {/* Bouton d'inscription */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium py-3 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                            >
                                {isLoading ? (
                                    <>
                                        <ElegantSpinner size="sm" />
                                        Création du compte...
                                    </>
                                ) : (
                                    <>
                                        <UserIcon className="h-5 w-5" />
                                        Créer mon compte
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Informations supplémentaires */}
                    <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                        <p>En créant un compte, vous acceptez nos conditions d'utilisation.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupModal; 