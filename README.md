# 🔍 API Catchall

Une API JavaScript qui capture et enregistre toutes les requêtes POST et PUT dans une base de données SQLite locale.

## 🚀 Fonctionnalités

- ✅ Capture automatique de toutes les requêtes POST et PUT sur `http://localhost:8800/*`
- ✅ Enregistrement en base SQLite avec toutes les informations :
  - Date et heure
  - IP source
  - URL demandée
  - Tous les headers HTTP
  - Payload complet
  - Paramètres de requête
- ✅ Réponse systématique 200 OK pour toutes les requêtes capturées
- ✅ Interface web pour visualiser toutes les données par ordre décroissant de date
- ✅ Recherche en temps réel dans les requêtes
- ✅ Auto-refresh de la page toutes les 30 secondes

## 📦 Installation

1. **Installer les dépendances :**
   ```bash
   npm install
   ```

2. **Démarrer le serveur :**
   ```bash
   npm start
   ```
   
   Ou en mode développement avec auto-reload :
   ```bash
   npm run dev
   ```

## 🌐 Utilisation

### Interface Web
- Ouvrez votre navigateur sur `http://localhost:8800`
- Visualisez toutes les requêtes capturées
- Utilisez la barre de recherche pour filtrer les requêtes
- La page se met à jour automatiquement toutes les 30 secondes

### API Endpoints

#### Capture des requêtes
- **POST** `http://localhost:8800/*` - Capture et enregistre la requête
- **PUT** `http://localhost:8800/*` - Capture et enregistre la requête

**Réponse :**
```json
{
  "success": true,
  "message": "Requête capturée avec succès",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "method": "POST",
  "url": "/api/test"
}
```

#### Visualisation
- **GET** `http://localhost:8800` - Affiche l'interface web avec toutes les données

## 🗄️ Base de Données

La base de données SQLite (`database.sqlite`) est créée automatiquement avec la structure suivante :

| Colonne | Type | Description |
|---------|------|-------------|
| id | INTEGER | Identifiant unique (auto-incrémenté) |
| timestamp | DATETIME | Date et heure de la requête |
| method | TEXT | Méthode HTTP (POST/PUT) |
| url | TEXT | URL demandée |
| ip_source | TEXT | Adresse IP source |
| user_agent | TEXT | User-Agent du client |
| content_type | TEXT | Type de contenu |
| content_length | INTEGER | Taille du contenu |
| headers | TEXT | Headers HTTP (JSON) |
| payload | TEXT | Corps de la requête |
| query_params | TEXT | Paramètres de requête (JSON) |

## 🛠️ Configuration

### Port
Le serveur fonctionne par défaut sur le port **8800**. Pour changer le port, modifiez la variable `PORT` dans `server.js`.

### Limite de taille
La limite de taille des requêtes est fixée à 50MB. Modifiez les paramètres `limit` dans `server.js` si nécessaire.

## 📁 Structure du Projet

```
apicatchall/
├── server.js          # Serveur principal Express
├── database.js        # Module de gestion SQLite
├── package.json       # Dépendances et scripts
├── views/
│   └── index.ejs      # Template de l'interface web
├── database.sqlite    # Base de données (créée automatiquement)
└── README.md          # Ce fichier
```

## 🔧 Dépendances

- **express** - Framework web
- **sqlite3** - Base de données SQLite
- **ejs** - Moteur de template
- **cors** - Gestion CORS
- **morgan** - Logging des requêtes

## 🚨 Notes Importantes

1. **Sécurité** : Cette API est conçue pour le développement et les tests. Ne l'utilisez pas en production sans mesures de sécurité appropriées.

2. **Performance** : Pour de gros volumes de requêtes, considérez l'ajout d'un système de pagination.

3. **Stockage** : La base de données SQLite grandit avec le temps. Pensez à la nettoyer périodiquement.

## 🐛 Dépannage

### Erreur de port déjà utilisé
```bash
Error: listen EADDRINUSE: address already in use :::8800
```
Changez le port dans `server.js` ou arrêtez le processus utilisant le port 8800.

### Problème de permissions SQLite
Assurez-vous que le dossier a les permissions d'écriture pour créer la base de données.

## 📝 Exemples d'utilisation

### Test avec curl
```bash
# Test POST
curl -X POST http://localhost:8800/api/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello World"}'

# Test PUT
curl -X PUT http://localhost:8800/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe"}'
```

### Test avec JavaScript
```javascript
fetch('http://localhost:8800/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    key: 'value',
    timestamp: new Date()
  })
});
```

## 📊 Interface Web

L'interface web offre :
- 📈 Statistiques en temps réel
- 🔍 Recherche instantanée
- 📱 Design responsive
- 🔄 Actualisation automatique
- 📋 Affichage détaillé de chaque requête

---

**Développé avec ❤️ en JavaScript/Node.js**
