import React, { useState, useEffect } from 'react';
import { 
    Share2Icon, 
    CopyIcon, 
    GlobeIcon, 
    XIcon,
    CheckIcon,
    AlertCircleIcon
} from './icons';
import type { Session, SharePermission, PublicShare, ShareInvitation } from '../types';
import shareService from '../services/shareService';

interface ShareModalProps {
    session: Session;
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ session, isOpen, onClose, currentUserId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [publicShare, setPublicShare] = useState<PublicShare | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadShareData();
        }
    }, [isOpen, session.id]);

    const loadShareData = async () => {
        try {
            setIsLoading(true);
            
            // Charger le partage public existant
            const publicShares = await shareService.getSessionByPublicLink(session.id);
            if (publicShares?.publicShare) {
                setPublicShare(publicShares.publicShare);
            }

        } catch (error) {
            console.error('Erreur lors du chargement des données de partage:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createPublicLink = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const share = await shareService.createPublicShare(session.id, currentUserId);
            setPublicShare(share);
            setSuccess('Lien public créé avec succès !');
            
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            setError('Erreur lors de la création du lien public');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            setError('Impossible de copier le lien');
        }
    };





    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <Share2Icon className="h-6 w-6 text-indigo-500" />
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            Partager "{session.title}"
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>



                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
                            <AlertCircleIcon className="h-5 w-5 text-red-500" />
                            <span className="text-red-700 dark:text-red-300">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-green-500" />
                            <span className="text-green-700 dark:text-green-300">{success}</span>
                        </div>
                    )}

                    {session.generationType === 'chat' ? (
                        <div className="space-y-4">
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircleIcon className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                                    Partage non disponible
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Les sessions de chat ne peuvent pas être partagées pour des raisons de confidentialité.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                                    Lien public
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Créez un lien public pour partager cette session avec n'importe qui.
                                </p>
                            </div>

                            {publicShare ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <input
                                            type="text"
                                            value={publicShare.publicLink}
                                            readOnly
                                            className="flex-1 bg-transparent text-sm text-slate-600 dark:text-slate-300"
                                        />
                                        <button
                                            onClick={() => copyToClipboard(publicShare.publicLink)}
                                            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    
                                </div>
                            ) : (
                                <button
                                    onClick={createPublicLink}
                                    disabled={isLoading}
                                    className="w-full bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? 'Création...' : 'Créer un lien public'}
                                </button>
                            )}
                        </div>
                    )}


                </div>
            </div>
        </div>
    );
};

export default ShareModal; 