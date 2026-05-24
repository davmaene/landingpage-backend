# ULPGL-Goma — Documentation API Backend

**Version :** 1.0
**Base URL (local) :** `http://localhost:8001`
**Base URL (production) :** votre `REACT_APP_BACKEND_URL`
**Stack :** Node.js · Express · Sequelize · MariaDB · JWT

> Tous les endpoints sont préfixés par `/api`.

---

## 🚀 Démarrage rapide

### 1. Importer la collection Postman
- Fichier : `/app/backend/postman_collection.json`
- Dans Postman : **File → Import → Upload Files** → sélectionnez ce fichier.

### 2. Configurer la variable de base
| Variable | Valeur par défaut |
|---|---|
| `base_url` | `http://localhost:8001` |
| `token` | (auto-rempli après login) |

### 3. Identifiants par défaut (seed)
| Rôle | Email | Mot de passe |
|---|---|---|
| Super admin | `admin@ulpgl.net` | `Admin@2026` |
| Publieur faculté | `publisher@ulpgl.net` | `Publisher@2026` |

---

## 🔐 Authentification

Toutes les routes protégées attendent l'en-tête :
```
Authorization: Bearer <JWT_TOKEN>
```

Le token est délivré par `POST /api/auth/login` (durée de vie : 7 jours).
Dans Postman, le script de test sauvegarde automatiquement le token dans `{{token}}`.

### Rôles
- `super_admin` — accès complet, validation des contenus, gestion utilisateurs
- `faculty_publisher` — création de contenus liés à sa faculté (statut `pending` jusqu'à validation)

---

## 📚 Endpoints

### Health
| Méthode | URL | Auth | Description |
|---|---|---|---|
| GET | `/api` | — | Statut du service |
| GET | `/api/health` | — | Healthcheck |

---

### Auth

#### `POST /api/auth/login`
**Body :**
```json
{ "email": "admin@ulpgl.net", "password": "Admin@2026" }
```
**Réponse 200 :**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1, "name": "Super Admin", "email": "admin@ulpgl.net",
    "role": "super_admin", "facultyId": null,
    "faculty": null
  }
}
```
**Erreurs :** `400` champs manquants · `401` identifiants invalides

#### `GET /api/auth/me`
Bearer requis. Renvoie `{ user }` du compte courant.

#### `POST /api/auth/register`
**Auth :** super_admin uniquement.
```json
{
  "name": "Jane Doe",
  "email": "jane@ulpgl.net",
  "password": "Jane@2026",
  "role": "faculty_publisher",
  "facultyId": 1
}
```
**Erreurs :** `403` non admin · `409` email déjà utilisé

#### `POST /api/auth/forgot-password`
```json
{ "email": "admin@ulpgl.net" }
```
**Réponse 200 (toujours, anti-leak) :**
```json
{
  "ok": true,
  "message": "Si ce compte existe, un lien a été envoyé.",
  "devLink": "/reset-password?token=..."   // uniquement si SendGrid non configuré
}
```

#### `POST /api/auth/reset-password`
```json
{ "token": "<token_reçu_par_email>", "password": "NewPassword@2026" }
```
- Token usage unique (`usedAt` posé après succès)
- Expiration : **1 heure**
- Mot de passe minimum : 6 caractères
- **Erreurs :** `400` token invalide/expiré ou mot de passe trop court

---

### Faculties (publiques, lecture seule)

| Méthode | URL | Description |
|---|---|---|
| GET | `/api/faculties` | Liste les 6 facultés + leurs filières |
| GET | `/api/faculties/:slug` | Détail d'une faculté |
| GET | `/api/faculties/:slug/filieres/:filiereSlug` | Détail d'une filière |

**Exemple slugs facultés :**
- `faculte-sciences-et-technologies`
- `faculte-sciences-economiques-et-de-gestion`
- `faculte-sciences-psychologiques-et-de-leducation`
- `faculte-sciences-de-la-sante`
- `faculte-sciences-juridiques-politiques-et-administratives`
- `faculte-sciences-de-lhomme-et-de-la-societe`

---

### Contents (Articles · Événements · Activités)

#### `GET /api/contents`
**Query params :**
| Paramètre | Type | Description |
|---|---|---|
| `type` | string | `article` \| `event` \| `activity` (optionnel) |
| `facultyId` | integer | Filtrer par faculté |
| `limit` | integer | Max 200 (défaut 50) |
| `status` | string | `published` par défaut |

#### `GET /api/contents/slug/:slug`
Retourne le contenu et incrémente le compteur `views`.

#### `GET /api/contents/admin` (Bearer)
- Publisher → ses propres contenus
- Admin → tous les contenus
- `status=pending` pour ne voir que ceux à valider

#### `POST /api/contents` (Bearer)
```json
{
  "type": "article",
  "title": "Titre de l'article",
  "excerpt": "Résumé court",
  "content": "<p>Contenu HTML complet</p>",
  "category": "Académique",
  "coverImage": "https://cloudinary.com/...",
  "eventDate": "2026-06-15T10:00:00.000Z",
  "location": "Salle 204"
}
```
- **Publisher** → `status: pending` (validation requise)
- **Admin** → `status: published` (publication immédiate)

#### `PUT /api/contents/:id` (Bearer — author ou admin)
Met à jour les champs fournis. **Pour un publisher, l'édition replace le contenu en `pending`.**

#### `POST /api/contents/:id/approve` (Admin)
Marque le contenu comme `published` avec `publishedAt = now()`.

#### `POST /api/contents/:id/reject` (Admin)
```json
{ "reason": "Contenu non conforme" }
```

#### `DELETE /api/contents/:id` (Bearer — author ou admin)

---

### Schedules (Horaires des cours & examens)

#### `GET /api/schedules`
**Query :**
| Param | Description |
|---|---|
| `type` | `cours` \| `examen` |
| `facultyId` | Filtrer par faculté |
| `promotion` | `L1` \| `L2` \| `L3` \| `M1` \| `M2` |
| `academicYear` | ex: `2025-2026` |

#### `GET /api/schedules/admin` (Bearer)

#### `POST /api/schedules` (Bearer)
```json
{
  "type": "cours",
  "title": "Horaire S1 — Génie Informatique L2",
  "facultyId": 1,
  "filiereId": 2,
  "promotion": "L2",
  "academicYear": "2025-2026",
  "semester": "S1",
  "startDate": "2026-01-15T08:00:00.000Z",
  "endDate": "2026-05-15T18:00:00.000Z",
  "location": "Salle 204",
  "fileUrl": "https://cloudinary.com/.../horaire.pdf",
  "description": "Horaire complet pour le semestre."
}
```

#### `PUT /api/schedules/:id` · `POST /:id/approve` · `POST /:id/reject` · `DELETE /:id`
Mêmes règles que `contents`.

---

### Centers (Centres de recherche)

#### `GET /api/centers`
Liste les centres `published` (avec champs JSON déjà désérialisés en arrays/objects).

#### `GET /api/centers/slug/:slug` (ex: `credda`, `cripe`, `bersac`)

#### `GET /api/centers/admin` (Bearer)

#### `POST /api/centers` (Bearer)
```json
{
  "title": "CREDDA",
  "description": "Description courte du centre.",
  "profile": "<p>Profil détaillé HTML.</p>",
  "coverImage": "https://cloudinary.com/...",
  "images": [],
  "direction": {
    "name": "Prof. Dr. Kennedy Kihangi Bindu",
    "role": "Directeur du CREDDA",
    "slug": "prof-dr-kennedy-kihangi-bindu",
    "email": ["credda@ulpgl.net"],
    "phone": ["+243 824 174 956"]
  },
  "domaineInterventions": [
    "Études et collectes des données",
    "Analyse des données"
  ],
  "etudesRealisees": [
    "Monitoring judiciaire et pénitentiaire"
  ],
  "partenaires": [
    "Harvard humanitarian initiative",
    "Association des barreaux américains (ABA)"
  ],
  "contacts": ["+243 824 174 956", "www.credda-ulpgl.org"]
}
```

#### `PUT /api/centers/:id` · `POST /:id/approve` · `POST /:id/reject` · `DELETE /:id`

---

### Search

#### `GET /api/search?q=...`
Recherche dans **contents** (publiés) + **faculties** + **filieres**.

**Réponse :**
```json
{
  "q": "ulpgl",
  "contents": [ ... 20 max ... ],
  "faculties": [ ... 10 max ... ],
  "filieres": [ ... 10 max, avec faculty inclus ... ]
}
```

---

### Newsletter

#### `POST /api/newsletter` (publique)
```json
{ "email": "abonne@example.com" }
```
- Stockage en base systématique
- Email de bienvenue envoyé via SendGrid si configuré, sinon SKIP gracieux

#### `GET /api/newsletter` (Admin)
Liste des abonnés actifs.

---

### Contact

#### `POST /api/contact` (publique)
```json
{
  "name": "Visiteur",
  "email": "visiteur@example.com",
  "subject": "Demande d'information",
  "message": "Bonjour..."
}
```
- Stockage en base systématique
- Notification email au super-admin si SendGrid configuré

#### `GET /api/contact` (Admin) · `DELETE /api/contact/:id` (Admin)

---

### Dashboard & Users

#### `GET /api/dashboard/stats` (Bearer)
**Réponse :**
```json
{
  "total": 3,
  "pending": 0,
  "published": 3,
  "rejected": 0,
  "newsletters": 5,
  "messages": 2,
  "schedulesTotal": 10,
  "schedulesPending": 1
}
```
- Publisher : compteurs scopés à ses propres contenus
- Admin : tout

#### `GET /api/users` (Admin)
Liste tous les comptes (sans `password`).

#### `PUT /api/users/:id` (Admin)
```json
{
  "name": "Nom mis à jour",
  "role": "faculty_publisher",
  "facultyId": 2,
  "isActive": true
}
```

---

### Cloudinary

> **⚠️ Configuration requise** : `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` dans `/app/backend/.env`. Sans ces clés, la signature renvoie `503`.

#### `GET /api/cloudinary/config` (Bearer)
```json
{ "configured": true, "cloudName": "votre-cloud-name" }
```

#### `GET /api/cloudinary/signature?folder=ulpgl/articles` (Bearer)
Renvoie les paramètres signés pour un **upload direct frontend → Cloudinary** (signature SHA-1 valable timestamp + folder).
**Dossiers autorisés :** `ulpgl/articles`, `ulpgl/events`, `ulpgl/activities`, `ulpgl/avatars`, `ulpgl/uploads`.

**Flow d'upload :**
1. Frontend appelle `/api/cloudinary/signature` (auth).
2. Reçoit `{ signature, timestamp, cloudName, apiKey, folder }`.
3. POST direct vers `https://api.cloudinary.com/v1_1/<cloudName>/image/upload` avec ces params + le fichier.
4. Cloudinary renvoie `{ secure_url }` à stocker.

---

## 📋 Codes de statut HTTP

| Code | Signification |
|---|---|
| 200 | OK |
| 201 | Created (ressource créée) |
| 400 | Bad request — champs manquants ou invalides |
| 401 | Non authentifié — token absent ou expiré |
| 403 | Accès refusé — rôle insuffisant |
| 404 | Ressource introuvable |
| 409 | Conflit (ex: email déjà utilisé) |
| 500 | Erreur serveur |
| 503 | Service externe non configuré (Cloudinary) |

---

## 🧪 Tests

Suite pytest backend : **66 tests passants (100%)**
```bash
cd /app/backend
pytest tests/test_ulpgl_backend.py -v
```

---

## 🔧 Variables d'environnement (`/app/backend/.env`)

```env
PORT=8001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ulpgl_db
DB_USER=ulpgl
DB_PASSWORD=ulpgl_pass_2026
JWT_SECRET=<changer en production>
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@ulpgl.net
ADMIN_PASSWORD=Admin@2026
PUBLISHER_EMAIL=publisher@ulpgl.net
PUBLISHER_PASSWORD=Publisher@2026
SENDGRID_API_KEY=         # optionnel
SENDER_EMAIL=no-reply@ulpgl.net
CLOUDINARY_CLOUD_NAME=    # optionnel
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
FRONTEND_URL=*
```

---

## 📦 Publier la collection en ligne

1. Importer `postman_collection.json` dans Postman desktop.
2. Clic droit sur la collection → **Share Collection** → **Get public link**.
3. Copier l'URL générée par Postman pour la diffuser à votre équipe.

Alternative : publier sur **Postman Workspaces** (cloud Postman) pour collaboration en équipe.
