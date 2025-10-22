#!/bin/bash

# Script d'initialisation Let's Encrypt
# Usage: ./init-letsencrypt.sh your-domain.com your-email@example.com

if [ $# -ne 2 ]; then
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "Initialisation de Let's Encrypt pour le domaine: $DOMAIN"
echo "Email: $EMAIL"

# Créer les répertoires nécessaires
mkdir -p certbot/conf
mkdir -p certbot/www

# Mettre à jour la configuration Nginx avec le bon domaine
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# Mettre à jour docker-compose.yml avec le bon domaine et email
sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.yml
sed -i "s/your-email@example.com/$EMAIL/g" docker-compose.yml

echo "Configuration mise à jour pour le domaine: $DOMAIN"
echo "Vous pouvez maintenant lancer: docker-compose up -d"
echo "Puis exécuter: docker-compose exec certbot certbot renew --dry-run"

