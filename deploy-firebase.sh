#!/bin/bash

echo "🚀 Déploiement d'Axonium sur Firebase..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    print_error "Vous devez être dans le répertoire racine du projet Axonium"
    exit 1
fi

# Vérifier si Firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI n'est pas installé. Installez-le avec: npm install -g firebase-tools"
    exit 1
fi

# Vérifier si l'utilisateur est connecté à Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Vous n'êtes pas connecté à Firebase. Connectez-vous avec: firebase login"
    exit 1
fi

print_message "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    print_error "Erreur lors de l'installation des dépendances"
    exit 1
fi

print_message "🔨 Build de l'application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Erreur lors du build de l'application"
    exit 1
fi

print_message "📁 Vérification du dossier dist..."
if [ ! -d "dist" ]; then
    print_error "Le dossier dist n'existe pas après le build"
    exit 1
fi

print_message "🌐 Déploiement sur Firebase..."
firebase deploy

if [ $? -eq 0 ]; then
    print_success "✅ Déploiement réussi !"
    print_message "Votre application est maintenant en ligne sur Firebase Hosting"
    print_message "URL: https://axonium-app.web.app"
    print_message "URL alternative: https://axonium-app.firebaseapp.com"
else
    print_error "❌ Erreur lors du déploiement"
    exit 1
fi

print_success "🎉 Axonium est maintenant déployé et accessible en ligne !" 