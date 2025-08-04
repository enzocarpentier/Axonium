import { db } from '../firebase';
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc,
    query, 
    where, 
    orderBy,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import type { 
    SharePermission, 
    PublicShare, 
    ShareInvitation, 
    Session,
    SessionWithSharing 
} from '../types';

class ShareService {
    private static instance: ShareService;
    private cache: Map<string, any> = new Map();

    private constructor() {}

    public static getInstance(): ShareService {
        if (!ShareService.instance) {
            ShareService.instance = new ShareService();
        }
        return ShareService.instance;
    }

    // Partager une session avec un utilisateur spécifique
    async shareSessionWithUser(
        sessionId: string,
        sharedByUserId: string,
        sharedWithUserId: string,
        permission: 'read' | 'write' | 'admin'
    ): Promise<SharePermission> {
        try {
            const shareData: any = {
                sessionId,
                sharedByUserId,
                sharedWithUserId,
                permission,
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'sharePermissions'), shareData);
            
            const sharePermission: SharePermission = {
                id: docRef.id,
                ...shareData,
                createdAt: shareData.createdAt
            };

            // Invalider le cache
            this.cache.delete(`permissions_${sessionId}`);
            
            return sharePermission;
        } catch (error) {
            console.error('Erreur lors du partage de session:', error);
            throw new Error('Impossible de partager la session');
        }
    }

    // Créer un partage public
    async createPublicShare(
        sessionId: string,
        sharedByUserId: string,
        expiresAt?: string
    ): Promise<PublicShare> {
        try {
            // Récupérer la session pour vérifier son type
            const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
            if (!sessionDoc.exists()) {
                throw new Error('Session introuvable');
            }

            const session = sessionDoc.data() as any;
            
            // Empêcher le partage des sessions de chat
            if (session.generationType === 'chat') {
                throw new Error('Les sessions de chat ne peuvent pas être partagées pour des raisons de confidentialité');
            }

            const shareToken = this.generateShareToken();
            const publicLink = `${window.location.origin}?shared=${shareToken}`;
            
            const shareData: any = {
                sessionId,
                sharedByUserId,
                publicLink,
                isActive: true,
                accessCount: 0,
                createdAt: new Date().toISOString()
            };

            // Ajouter expiresAt seulement s'il est défini
            if (expiresAt) {
                shareData.expiresAt = expiresAt;
            }

            const docRef = await addDoc(collection(db, 'publicShares'), shareData);
            
            const publicShare: PublicShare = {
                id: docRef.id,
                ...shareData,
                createdAt: shareData.createdAt
            };

            // Invalider le cache
            this.cache.delete(`public_${sessionId}`);
            
            return publicShare;
        } catch (error) {
            console.error('Erreur lors de la création du partage public:', error);
            throw new Error('Impossible de créer le partage public');
        }
    }

    // Envoyer une invitation par email
    async sendShareInvitation(
        sessionId: string,
        sharedByUserId: string,
        sharedWithEmail: string,
        permission: 'read' | 'write' | 'admin'
    ): Promise<ShareInvitation> {
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

            const invitationData: any = {
                sessionId,
                sharedByUserId,
                sharedWithEmail,
                status: 'pending',
                createdAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString()
            };

            const docRef = await addDoc(collection(db, 'shareInvitations'), invitationData);
            
            const invitation: ShareInvitation = {
                id: docRef.id,
                ...invitationData,
                createdAt: invitationData.createdAt
            };

            // TODO: Envoyer un email d'invitation avec le lien direct
            // const invitationLink = `${window.location.origin}?invitation=${invitation.id}`;
            // await this.sendInvitationEmail(invitation, invitationLink);

            return invitation;
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'invitation:', error);
            throw new Error('Impossible d\'envoyer l\'invitation');
        }
    }

    // Obtenir les permissions d'un utilisateur pour une session
    async getUserPermissions(sessionId: string, userId: string): Promise<SharePermission[]> {
        const cacheKey = `permissions_${sessionId}_${userId}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const q = query(
                collection(db, 'sharePermissions'),
                where('sessionId', '==', sessionId),
                where('sharedWithUserId', '==', userId)
            );

            const querySnapshot = await getDocs(q);
            const permissions: SharePermission[] = [];

            querySnapshot.forEach((doc) => {
                permissions.push({
                    id: doc.id,
                    ...doc.data()
                } as SharePermission);
            });

            this.cache.set(cacheKey, permissions);
            return permissions;
        } catch (error) {
            console.error('Erreur lors de la récupération des permissions:', error);
            return [];
        }
    }

    // Obtenir les sessions partagées avec un utilisateur
    async getSharedSessions(userId: string): Promise<SessionWithSharing[]> {
        try {
            console.log('🔍 Tentative de récupération des sessions partagées pour:', userId);
            
            // Vérifier si Firestore est initialisé
            if (!db) {
                console.warn('⚠️ Firestore non initialisé, impossible de récupérer les sessions partagées');
                return [];
            }
            
            const q = query(
                collection(db, 'sharePermissions'),
                where('sharedWithUserId', '==', userId)
            );

            const querySnapshot = await getDocs(q);
            console.log('✅ Permissions trouvées:', querySnapshot.size);
            
            const sharedSessions: SessionWithSharing[] = [];

            for (const permissionDoc of querySnapshot.docs) {
                try {
                    const permission = permissionDoc.data() as SharePermission;
                    
                    // Récupérer la session correspondante
                    const sessionDoc = await getDoc(doc(db, 'sessions', permission.sessionId));
                    if (sessionDoc.exists()) {
                        const session = sessionDoc.data() as Session;
                        const sessionWithSharing: SessionWithSharing = {
                            ...session,
                            isShared: true,
                            sharedBy: permission.sharedByUserId,
                            sharePermissions: [permission]
                        };
                        sharedSessions.push(sessionWithSharing);
                    }
                } catch (sessionError) {
                    console.warn('⚠️ Erreur lors de la récupération d\'une session partagée:', sessionError);
                    // Continuer avec les autres sessions
                }
            }

            console.log('✅ Sessions partagées récupérées:', sharedSessions.length);
            return sharedSessions;
        } catch (error) {
            console.warn('⚠️ Erreur lors de la récupération des sessions partagées (fonctionnalité non critique):', error);
            // Retourner un tableau vide au lieu de faire échouer l'application
            return [];
        }
    }

    // Récupérer une session par lien public
    async getSessionByPublicLink(shareToken: string): Promise<SessionWithSharing | null> {
        try {
            const q = query(
                collection(db, 'publicShares'),
                where('publicLink', '==', `${window.location.origin}?shared=${shareToken}`),
                where('isActive', '==', true)
            );

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return null;
            }

            const publicShare = querySnapshot.docs[0].data() as PublicShare;
            
            // Vérifier l'expiration
            if (publicShare.expiresAt && new Date(publicShare.expiresAt) < new Date()) {
                return null;
            }

            // Récupérer la session
            const sessionDoc = await getDoc(doc(db, 'sessions', publicShare.sessionId));
            if (!sessionDoc.exists()) {
                return null;
            }

            const session = sessionDoc.data() as Session;
            
            // Incrémenter le compteur d'accès
            await updateDoc(doc(db, 'publicShares', querySnapshot.docs[0].id), {
                accessCount: publicShare.accessCount + 1
            });

            return {
                ...session,
                isShared: true,
                sharedBy: publicShare.sharedByUserId,
                publicShare
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de la session publique:', error);
            return null;
        }
    }

    // Récupérer une session par invitation
    async getSessionByInvitation(invitationToken: string): Promise<SessionWithSharing | null> {
        try {
            const q = query(
                collection(db, 'shareInvitations'),
                where('id', '==', invitationToken),
                where('status', '==', 'pending')
            );

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                return null;
            }

            const invitation = querySnapshot.docs[0].data() as ShareInvitation;
            
            // Vérifier l'expiration
            if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
                return null;
            }

            // Récupérer la session
            const sessionDoc = await getDoc(doc(db, 'sessions', invitation.sessionId));
            if (!sessionDoc.exists()) {
                return null;
            }

            const session = sessionDoc.data() as Session;
            
            // Marquer l'invitation comme acceptée
            await updateDoc(doc(db, 'shareInvitations', querySnapshot.docs[0].id), {
                status: 'accepted'
            });

            return {
                ...session,
                isShared: true,
                sharedBy: invitation.sharedByUserId,
                shareInvitation: invitation
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de la session par invitation:', error);
            return null;
        }
    }

    // Révoquer un partage
    async revokeShare(shareId: string, shareType: 'permission' | 'public' | 'invitation'): Promise<void> {
        try {
            const collectionName = shareType === 'permission' ? 'sharePermissions' : 
                                 shareType === 'public' ? 'publicShares' : 'shareInvitations';
            
            await deleteDoc(doc(db, collectionName, shareId));
            
            // Invalider le cache
            this.cache.clear();
        } catch (error) {
            console.error('Erreur lors de la révocation du partage:', error);
            throw new Error('Impossible de révoquer le partage');
        }
    }

    // Mettre à jour les permissions
    async updateSharePermission(
        shareId: string,
        permission: 'read' | 'write' | 'admin'
    ): Promise<void> {
        try {
            await updateDoc(doc(db, 'sharePermissions', shareId), {
                permission
            });
            
            // Invalider le cache
            this.cache.clear();
        } catch (error) {
            console.error('Erreur lors de la mise à jour des permissions:', error);
            throw new Error('Impossible de mettre à jour les permissions');
        }
    }

    // Générer un token de partage unique
    private generateShareToken(): string {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    // Nettoyer le cache
    clearCache(): void {
        this.cache.clear();
    }
}

export default ShareService.getInstance(); 