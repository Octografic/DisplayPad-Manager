# Contribuer

1. Forkez le dépôt et créez une branche (`git checkout -b ma-fonction`).
2. `npm install`, puis `npm start` pour essayer vos changements.
3. Lancez `npm test` avant d'envoyer une pull request.
4. Ouvrez la pull request en décrivant le changement et, si possible, le matériel testé.

Règles de sécurité à respecter :

- Ne jamais insérer de texte utilisateur avec `innerHTML` (utiliser `textContent`).
- Toute nouvelle action ou donnée doit être validée dans `src/store.js` et revalidée à l'exécution.
- Ne jamais lancer de commande via un shell ni construire de commande à partir de texte libre.
- Les nouvelles touches autorisées vont dans la table blanche de `src/keys.js`.
