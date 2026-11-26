# DisplayPad Manager

Alternative open source, simple et légère au logiciel Base Camp pour gérer le **Mountain DisplayPad** : images des touches, raccourcis clavier et profils.

*English: a simple open-source alternative to Mountain Base Camp for the Mountain DisplayPad — key images, keyboard shortcuts and profiles. See the [English summary](#english-summary) below.*

> ⚠️ Projet communautaire **non affilié à Mountain**. Le protocole USB provient de la bibliothèque rétro-ingéniérée [`mountain-displaypad`](https://www.npmjs.com/package/mountain-displaypad). Utilisation à vos risques et périls.

## Fonctionnalités

- Grille des 12 touches identique à l'appareil, avec retour visuel quand vous appuyez sur une touche
- Interface en **anglais** (par défaut), **français** et **espagnol**, à changer d'un clic sur les drapeaux
- Profils multiples, chacun avec **plusieurs pages** ; une touche peut renvoyer vers une autre page pour les relier entre elles
- Images par glisser-déposer (PNG, JPG, BMP, WebP ; première image d'un GIF), redimensionnées en 104×104 et enregistrées sous `1.png` … `12.png`
- **Image globale** par page : une image 624×208 (`global.jpg`) découpée en 12 touches de 104×104 (2 lignes de 6)
- Une touche avec une action mais sans image affiche automatiquement l'action en texte (ex. « Ctrl+C », « → Page 2 »)
- Bouton pour ouvrir le dossier des images de la page
- Actions par touche : raccourci clavier (enregistré en le tapant) ou touche multimédia, lancer un programme, ouvrir un lien web, aller à une page, changer de profil
- Import / export des profils en JSON (les fichiers d'image source ne sont pas inclus)

Les images sont rangées dans `%APPDATA%\displaypad-manager\images\<profil>\<page>\`.
- Reste dans la zone de notification, démarrage avec Windows en option

## Installation

1. Téléchargez `DisplayPad-Manager-portable.exe` dans l'onglet [Releases](../../releases).
2. **Fermez Mountain Base Camp** (il utilise l'appareil en exclusivité).
3. Lancez l'exe. L'application n'étant pas signée, SmartScreen affiche un avertissement : *Informations complémentaires* puis *Exécuter quand même*.

## Développement

Prérequis : Node.js 20+.

```bash
npm install
npm start        # lance l'application
npm test         # tests unitaires (validation, sécurité)
npm run dist     # construit l'exe Windows dans dist/
```

Structure :

| Fichier | Rôle |
|---|---|
| `main.js` | Processus principal Electron, IPC, actions |
| `preload.js` | Pont minimal et sécurisé vers l'interface |
| `renderer/` | Interface (HTML / CSS / JS sans framework) |
| `renderer/i18n.js` | Traductions EN / FR / ES |
| `src/device.js` | Connexion USB et reconnexion automatique |
| `src/keys.js` | Table blanche des touches autorisées |
| `src/sender.js` | Envoi de raccourcis via PowerShell persistant |
| `src/store.js` | Stockage JSON et validation stricte |

## Sécurité

- Toutes les données (profils, actions, images) sont revalidées avant d'être enregistrées **et** avant d'être exécutées.
- Raccourcis : seuls des codes issus d'une liste blanche sont transmis à PowerShell, jamais de texte libre.
- Programmes : lancés sans shell. Liens : `http` et `https` uniquement.
- Interface : aucun texte utilisateur inséré en HTML, politique CSP stricte, isolation de contexte, pas d'accès Node, pas de contenu distant.

Une faille ? Ouvrez une *security advisory* privée sur le dépôt.

## Limites connues

- Non testé sur toutes les révisions matérielles ; seul l'identifiant USB `3282:0009` est géré.
- Pas de GIF animés, pas de dossiers de touches, pas de macros multi-étapes.
- Raccourcis envoyés uniquement sous Windows et ignorés par les applications lancées en administrateur.

## Contribuer

Les issues et pull requests sont les bienvenues (voir [CONTRIBUTING.md](CONTRIBUTING.md)). Les idées utiles : GIF animés, macros, thèmes, Linux / macOS, SQLite.

## Licence

[MIT](LICENSE). Basé sur [`mountain-displaypad`](https://github.com/JeLuF/mountain-displaypad) (MIT).

## English summary

DisplayPad Manager is an unofficial, open-source tool (UI in English, French and Spanish) to set key images, keyboard shortcuts, app launchers, URLs and profiles on the Mountain DisplayPad without Base Camp. Download the portable `.exe` from Releases, close Base Camp first, and run it (SmartScreen will warn because the app is unsigned). Build from source with `npm install && npm run dist`. Not affiliated with Mountain.
