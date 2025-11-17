# MathALÉA est maintenant sur forge.aeif.fr/coopmaths/mathalea

MathALÉA est un générateur d'exercices de mathématiques qui suit le programme actuel de mathématiques en France.

Il propose plusieurs utilisations possibles : 

* Affichage des exercices dans le navigateur
* Export LaTeX des énoncés des exercices
* Création de liens personnalisés à destination des élèves
* Exercices avec ou sans interactivité
* Affichage des questions en mode diaporama
* ...

Le moteur développé depuis 2018 connait un développement régulier grâce à une communauté de professeurs de mathématiques en exercice qui améliorent l'interface et proposent toujours de nouveaux exercices.


## Utilisation en local

La dernière version est disponible sur https://coopmaths.fr/alea.

Vous pouvez récupérer une copie du dépot et l'utiliser en local. Pour cela, vous aurez besoin d'une version récente de NodeJS afin d'exécuter les commandes suivantes.

De notre côté, on utilise pnpm, mais vous pouvez le remplacer par npm.

```
pnpm install
pnpm start
```

## Générer une base de données d'exercices

Le script `tasks/generateExercisesDataset.js` automatise l'exécution de la fonction `nouvelleVersion` de chaque exercice et
enregistre les énoncés/corrections générés dans un fichier JSON. Il s'appuie sur la même pipeline que l'interface MathALEA
(classe `Exercice`, `listeQuestionsToContenu`, etc.).

```bash
pnpm generate:dataset -- --perExercise=5 --limit=0 --format=html --output=data/exercices.json
```

Options principales :

* `--perExercise` : nombre de versions générées par exercice (défaut : 1).
* `--limit` : nombre maximal d'exercices parcourus (0 = tous).
* `--format` : `html`, `latex` ou `amc` pour choisir la mise en forme dans le dataset.
* `--output` : chemin du fichier de sortie.

Le JSON généré contient la date de génération, des statistiques globales (`stats.exercices`, `stats.samples`, `stats.visites`),
les éventuelles erreurs rencontrées (`failures`) et une liste `exercises` où chaque entrée regroupe le chemin source, les
métadonnées (titre, ref, uuid, tags) et la liste des échantillons produits (questions, corrections, contenu HTML, graine utilisée,
etc.).

> ⚠️ Le script charge dynamiquement tous les modules d'exercices : assurez-vous d'avoir installé les dépendances (`pnpm install`)
> avant son exécution, faute de quoi certaines importations échoueront (les erreurs seront alors consignées dans `failures`).

## Participer au développement

La communauté de développeur autour de MathALEA est ouverte et prête à accompagner toutes les bonnes volontés intéressées pour améliorer l'outil.

La documentation est disponible sur https://github.com/mathalea/mathalea/wiki. Vous pouvez nous contacter à contact@coopmaths.fr.
