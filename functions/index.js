const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Fonction pour créer un compte utilisateur
exports.createUserAccount = functions.https.onCall(async (data, context) => {
    // Vérifier que l'utilisateur est authentifié et admin
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est admin (vous pouvez adapter cette logique)
    const adminEmails = ['admin@axonium.fr', 'enzocarpentier@gmail.com', 'enzo147630@gmail.com'];
    if (!adminEmails.includes(context.auth.token.email)) {
        throw new functions.https.HttpsError('permission-denied', 'Accès refusé - Admin requis');
    }

    try {
        const { email, password, firstName, lastName, requestId } = data;

        // Créer le compte utilisateur
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false
        });

        // Créer le profil utilisateur dans Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            email: email,
            firstName: firstName,
            lastName: lastName,
            createdAt: new Date().toISOString(),
            approvedFromRequest: requestId,
            hasSeenWelcomeNotification: false,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false
        });

        // Mettre à jour le statut de la demande
        await admin.firestore().collection('accountRequests').doc(requestId).update({
            status: 'approved',
            reviewedAt: new Date().toISOString(),
            approvedUserId: userRecord.uid
        });

        // Envoyer un email de vérification
        try {
            await admin.auth().generateEmailVerificationLink(email);
        } catch (verificationError) {
            console.warn('Échec de l\'envoi de l\'email de vérification:', verificationError);
        }

        return {
            success: true,
            uid: userRecord.uid,
            message: 'Compte utilisateur créé avec succès'
        };

    } catch (error) {
        console.error('Erreur lors de la création du compte:', error);
        
        // Gestion spécifique des erreurs Firebase Auth
        if (error.code === 'auth/email-already-in-use') {
            throw new functions.https.HttpsError('already-exists', 'Un compte existe déjà avec cet email');
        } else if (error.code === 'auth/weak-password') {
            throw new functions.https.HttpsError('invalid-argument', 'Le mot de passe est trop faible');
        } else if (error.code === 'auth/invalid-email') {
            throw new functions.https.HttpsError('invalid-argument', 'Adresse email invalide');
        } else {
            throw new functions.https.HttpsError('internal', `Impossible de créer le compte: ${error.message}`);
        }
    }
}); 