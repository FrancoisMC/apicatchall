# API CatchAll - Déploiement Docker

## 🐳 Configuration Docker

Ce projet est configuré pour fonctionner avec Docker et Docker Compose, avec un reverse proxy Nginx et gestion automatique des certificats SSL Let's Encrypt.

## 📁 Structure des fichiers

```
apicatchall/
├── Dockerfile                 # Image de l'application
├── docker-compose.yml         # Configuration de production
├── docker-compose.override.yml # Configuration de développement
├── .dockerignore             # Fichiers à ignorer lors du build
├── nginx/
│   ├── nginx.conf            # Configuration Nginx production (SSL)
│   └── nginx-dev.conf        # Configuration Nginx développement
├── scripts/
│   └── init-letsencrypt.sh   # Script d'initialisation SSL
└── README-Docker.md          # Ce fichier
```

## 🚀 Déploiement en production

### 1. Configuration initiale

```bash
# Rendre le script exécutable
chmod +x scripts/init-letsencrypt.sh

# Initialiser Let's Encrypt (remplacer par votre domaine et email)
./scripts/init-letsencrypt.sh your-domain.com your-email@example.com
```

### 2. Déploiement

```bash
# Construire et démarrer les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Vérifier le statut
docker-compose ps
```

### 3. Renouvellement automatique des certificats

```bash
# Tester le renouvellement
docker-compose exec certbot certbot renew --dry-run

# Ajouter une tâche cron pour le renouvellement automatique
# 0 12 * * * /usr/bin/docker-compose -f /path/to/docker-compose.yml exec -T certbot certbot renew --quiet
```

## 🛠️ Développement local

### Sans SSL (développement)

```bash
# Utiliser la configuration de développement
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d

# L'application sera accessible sur http://localhost:8080
# L'accès direct reste disponible sur http://localhost:8800
```

### Avec SSL local (test)

```bash
# Utiliser la configuration de production
docker-compose up -d

# L'application sera accessible sur https://localhost (nécessite certificats)
# L'accès direct reste disponible sur http://localhost:8800
```

## 🔧 Configuration

### Ports exposés

- **80** : HTTP (redirige vers HTTPS)
- **443** : HTTPS (reverse proxy)
- **8800** : Accès direct HTTP à l'application

### Volumes persistants

- `./database.sqlite` : Base de données SQLite
- `./export` : Fichiers d'export JSON
- `./archives` : Archives ZIP
- `./certbot/conf` : Certificats Let's Encrypt
- `./certbot/www` : Challenge web Let's Encrypt

### Variables d'environnement

- `NODE_ENV=production` : Mode de production

## 🔒 Sécurité

### Headers de sécurité

Le reverse proxy Nginx ajoute automatiquement :
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Rate Limiting

- Limite : 10 requêtes par seconde par IP
- Burst : 20 requêtes avec nodelay

### Préservation de l'IP d'origine

L'IP d'origine est préservée via les headers :
- `X-Real-IP`
- `X-Forwarded-For`
- `X-Forwarded-Proto`

## 🐛 Dépannage

### Vérifier les logs

```bash
# Logs de l'application
docker-compose logs apicatchall

# Logs de Nginx
docker-compose logs nginx

# Logs de Certbot
docker-compose logs certbot
```

### Redémarrer les services

```bash
# Redémarrer tous les services
docker-compose restart

# Redémarrer un service spécifique
docker-compose restart nginx
```

### Reconstruire l'image

```bash
# Reconstruire l'image de l'application
docker-compose build apicatchall

# Redémarrer avec la nouvelle image
docker-compose up -d apicatchall
```

## 📝 Notes importantes

1. **Domaine requis** : Pour la production, vous devez avoir un domaine valide pointant vers votre serveur
2. **Ports ouverts** : Assurez-vous que les ports 80 et 443 sont ouverts sur votre serveur
3. **Certificats** : Les certificats Let's Encrypt sont automatiquement renouvelés
4. **Sauvegarde** : Pensez à sauvegarder le volume `database.sqlite` régulièrement
5. **Accès direct** : Le port 8800 reste accessible pour le debugging

## 🔄 Mise à jour

```bash
# Arrêter les services
docker-compose down

# Mettre à jour le code
git pull

# Reconstruire et redémarrer
docker-compose up -d --build
```

