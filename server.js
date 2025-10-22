const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Database = require('./database');

const app = express();
const PORT = 8800;

// Initialiser la base de données
const db = new Database();

// Configuration par défaut
let config = {
    responseCode: 200
};

// Middleware
app.use(cors());
// app.use(morgan('combined')); // Désactivé pour supprimer les logs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Fonction pour extraire l'IP réelle (gère les proxies)
function getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip;
}

// Route pour la configuration
app.post('/config', (req, res) => {
    const { responseCode } = req.body;
    
        if (responseCode && (responseCode === 200 || responseCode === 503)) {
            config.responseCode = responseCode;
            res.json({
                success: true,
                message: `Code de réponse configuré sur ${responseCode}`,
                config: config
            });
        } else {
        res.status(400).json({
            success: false,
            message: 'Code de réponse invalide. Utilisez 200 ou 503.'
        });
    }
});


// Route pour effacer toutes les données (doit être AVANT les routes catchall)
app.post('/clear', (req, res) => {
    db.clearAllRequests((err, deletedCount) => {
        if (err) {
            console.error('Erreur lors de la suppression:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression des données'
            });
        }
        
        res.json({
            success: true,
            message: `Toutes les données ont été supprimées (${deletedCount} entrées)`,
            deletedCount: deletedCount
        });
    });
});

// Route pour exporter toutes les données
app.post('/export', (req, res) => {
    // Créer le répertoire export s'il n'existe pas
    const exportDir = path.join(__dirname, 'export');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }

    // Récupérer toutes les données de la base
    db.getAllRequests((err, requests) => {
        if (err) {
            console.error('Erreur lors de la récupération des données:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des données'
            });
        }

        if (requests.length === 0) {
            return res.json({
                success: true,
                message: 'Aucune donnée à exporter',
                exportedFiles: 0
            });
        }

        let exportedCount = 0;
        const errors = [];

        // Exporter chaque requête dans un fichier séparé
        requests.forEach((request, index) => {
            try {
                // Formater l'URL pour le nom de fichier (remplacer / par _)
                const urlForFilename = request.url.replace(/\//g, '_').replace(/^_/, '') || 'root';
                
                // Formater la date/heure
                const date = new Date(request.timestamp);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const seconds = String(date.getSeconds()).padStart(2, '0');
                
                const dateTimeStr = `${year}${month}${day}_${hours}${minutes}${seconds}`;
                
                // Nom du fichier
                const filename = `${urlForFilename}-${dateTimeStr}.json`;
                const filepath = path.join(exportDir, filename);
                
                // Données à exporter avec structure header/payload
                let parsedPayload;
                try {
                    // Essayer de parser le payload JSON
                    parsedPayload = request.payload ? JSON.parse(request.payload) : null;
                } catch (e) {
                    // Si ce n'est pas du JSON valide, garder le payload tel quel
                    parsedPayload = request.payload;
                }

                const exportData = {
                    header: {
                        id: request.id,
                        timestamp: request.timestamp,
                        method: request.method,
                        url: request.url,
                        ip_source: request.ip_source,
                        user_agent: request.user_agent,
                        content_type: request.content_type,
                        content_length: request.content_length,
                        headers: {
                            ...request.headers,
                            query_params: request.query_params
                        }
                    },
                    payload: parsedPayload
                };
                
                // Écrire le fichier
                fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2), 'utf8');
                exportedCount++;
                
            } catch (error) {
                console.error(`Erreur lors de l'exportation de la requête ${index + 1}:`, error);
                errors.push(`Requête ${index + 1}: ${error.message}`);
            }
        });

        if (errors.length > 0) {
            return res.json({
                success: false,
                message: `Exportation partiellement réussie. ${exportedCount} fichiers exportés, ${errors.length} erreurs.`,
                exportedFiles: exportedCount,
                errors: errors
            });
        }

        // Si l'exportation a réussi, supprimer toutes les données de la base
        db.clearAllRequests((err, deletedCount) => {
            if (err) {
                console.error('Erreur lors de la suppression après export:', err);
                return res.json({
                    success: true,
                    message: `${exportedCount} fichiers exportés avec succès, mais erreur lors de la suppression des données de la base: ${err.message}`,
                    exportedFiles: exportedCount,
                    warning: 'Les données n\'ont pas été supprimées de la base'
                });
            }
            
            res.json({
                success: true,
                message: `${exportedCount} fichiers exportés avec succès dans le répertoire ./export et ${deletedCount} entrées supprimées de la base`,
                exportedFiles: exportedCount,
                deletedFromDatabase: deletedCount
            });
        });
    });
});

// Route pour télécharger un ZIP de tous les fichiers exportés
app.post('/download-zip', (req, res) => {
    const exportDir = path.join(__dirname, 'export');
    const archivesDir = path.join(__dirname, 'archives');
    
    // Vérifier si le répertoire export existe
    if (!fs.existsSync(exportDir)) {
        return res.status(404).json({
            success: false,
            message: 'Aucun fichier exporté trouvé. Veuillez d\'abord exporter des données.'
        });
    }

    // Lire tous les fichiers JSON du répertoire export
    const files = fs.readdirSync(exportDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
        return res.status(404).json({
            success: false,
            message: 'Aucun fichier JSON trouvé dans le répertoire d\'export.'
        });
    }

    // Créer le répertoire archives s'il n'existe pas
    if (!fs.existsSync(archivesDir)) {
        fs.mkdirSync(archivesDir, { recursive: true });
    }

    // Configurer les headers pour le téléchargement
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const zipFileName = `export_${timestamp}.zip`;
    const zipPath = path.join(archivesDir, zipFileName);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Créer l'archive ZIP
    const archive = archiver('zip', {
        zlib: { level: 9 } // Compression maximale
    });

    // Créer un stream de fichier pour sauvegarder le ZIP dans /archives
    const output = fs.createWriteStream(zipPath);

    // Gérer les erreurs d'archive
    archive.on('error', (err) => {
        console.error('Erreur lors de la création du ZIP:', err);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création du fichier ZIP'
            });
        }
    });

    // Gérer la fin de l'archive
    archive.on('end', () => {
        console.log(`ZIP créé et sauvegardé dans /archives: ${zipFileName}`);
        
        // Nettoyer le répertoire export après création du ZIP
        try {
            files.forEach(file => {
                const filePath = path.join(exportDir, file);
                fs.unlinkSync(filePath);
            });
            console.log('Répertoire /export nettoyé avec succès');
        } catch (err) {
            console.error('Erreur lors du nettoyage du répertoire export:', err);
        }
    });

    // Connecter l'archive à la réponse et au fichier de sauvegarde
    archive.pipe(res);
    archive.pipe(output);

    // Ajouter tous les fichiers JSON à l'archive
    files.forEach(file => {
        const filePath = path.join(exportDir, file);
        archive.file(filePath, { name: file });
    });

    // Finaliser l'archive
    archive.finalize();
});

// Route pour supprimer une requête spécifique
app.post('/delete-request', (req, res) => {
    const { id } = req.body;
    
    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'ID de requête manquant'
        });
    }

    db.deleteRequestById(id, (err, deletedCount) => {
        if (err) {
            console.error('Erreur lors de la suppression de la requête:', err);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de la requête'
            });
        }
        
        if (deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Requête non trouvée'
            });
        }
        
        res.json({
            success: true,
            message: 'Requête supprimée avec succès',
            deletedCount: deletedCount
        });
    });
});

// Route catchall pour POST et PUT - retourne toujours 200 OK
app.post('*', (req, res) => {
    // Capturer les données de la requête
    const requestData = {
        method: req.method,
        url: req.originalUrl,
        ipSource: getClientIP(req),
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        headers: req.headers,
        payload: JSON.stringify(req.body) || req.body,
        queryParams: req.query
    };

    // Enregistrer en base de données
    db.insertRequest(requestData);


    res.status(config.responseCode).json({
        success: true,
        //message: 'Requête capturée avec succès',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl
    });
});

app.put('*', (req, res) => {
    // Capturer les données de la requête
    const requestData = {
        method: req.method,
        url: req.originalUrl,
        ipSource: getClientIP(req),
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        headers: req.headers,
        payload: JSON.stringify(req.body) || req.body,
        queryParams: req.query
    };

    // Enregistrer en base de données
    db.insertRequest(requestData);


    res.status(config.responseCode).json({
        success: true,
        //message: 'Requête capturée avec succès',
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl
    });
});

// Route GET pour afficher les données (doit être en dernier)
app.get('*', (req, res) => {
    db.getAllRequests((err, requests) => {
        if (err) {
            console.error('Erreur lors de la récupération des données:', err);
            return res.status(500).send('Erreur serveur');
        }
        
        res.render('index', { 
            requests: requests,
            totalRequests: requests.length,
            currentTime: new Date().toLocaleString('fr-FR')
        });
    });
});

// Configuration du moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Erreur interne du serveur',
        error: err.message
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 API Catchall démarrée sur http://localhost:${PORT}`);
    console.log(`📊 Interface web disponible sur http://localhost:${PORT}`);
    console.log(`📝 Capture des requêtes POST/PUT sur http://localhost:${PORT}/*`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Arrêt du serveur...');
    db.close();
    process.exit(0);
});
