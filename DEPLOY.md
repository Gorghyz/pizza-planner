# Déploiement — À table tonton !

Ce document décrit le déploiement du site atabletonton.fr.

Le projet est une application Next.js hébergée sur un serveur Hetzner, avec PostgreSQL, Nginx en reverse proxy, et un service systemd pour lancer l’application.

---

## 1. Informations générales

Domaine public :

    https://atabletonton.fr
    https://www.atabletonton.fr

Dossier du projet sur le serveur :

    /home/deploy/apps/pizza-planner

Branche déployée :

    main

Service systemd :

    pizza-planner.service

L’application Next.js écoute localement sur :

    127.0.0.1:3000

Nginx reçoit le trafic HTTPS public et le redirige vers Next.js.

---

## 2. Déploiement classique sur le serveur

Se connecter au serveur :

    ssh deploy@ADRESSE_IP_DU_SERVEUR

Se placer dans le dossier du projet :

    cd /home/deploy/apps/pizza-planner

Vérifier l’état Git :

    git status

Si next-env.d.ts est modifié après un build ou un redémarrage, le remettre proprement :

    git restore next-env.d.ts

Tirer la dernière version depuis GitHub :

    git pull origin main

Installer les dépendances si nécessaire :

    npm install

Compiler l’application :

    npm run build

Redémarrer le service :

    sudo systemctl restart pizza-planner

Vérifier l’état du service :

    sudo systemctl status pizza-planner --no-pager

Tester ensuite dans le navigateur :

    https://atabletonton.fr
    https://atabletonton.fr/carte
    https://atabletonton.fr/business/login

---

## 3. Commandes de vérification rapides

Vérifier que le bon commit est sur le serveur :

    cd /home/deploy/apps/pizza-planner
    git log --oneline -5

Vérifier que le service Next.js tourne :

    ps aux | grep -Ei "node|next|npm|pizza" | grep -v grep

Vérifier Nginx :

    sudo nginx -t
    sudo systemctl status nginx --no-pager

Vérifier le service applicatif :

    sudo systemctl status pizza-planner --no-pager

Tester les pages principales :

    curl -I https://atabletonton.fr
    curl -I https://atabletonton.fr/carte
    curl -I https://atabletonton.fr/mentions-legales
    curl -I https://atabletonton.fr/politique-confidentialite

---

## 4. Service systemd

Le service utilisé est :

    pizza-planner.service

Il est situé dans :

    /etc/systemd/system/pizza-planner.service

Il lance l’application avec :

    npm run start -- --hostname 127.0.0.1 --port 3000

Commandes utiles :

    sudo systemctl restart pizza-planner
    sudo systemctl stop pizza-planner
    sudo systemctl start pizza-planner
    sudo systemctl status pizza-planner --no-pager

Voir les logs du service :

    sudo journalctl -u pizza-planner -n 100 --no-pager

Suivre les logs en direct :

    sudo journalctl -u pizza-planner -f

---

## 5. Configuration Nginx

Le fichier actif du site est :

    /etc/nginx/sites-available/atabletonton

Il est activé par un lien symbolique dans :

    /etc/nginx/sites-enabled/atabletonton

Configuration attendue :

    server {
        server_name atabletonton.fr www.atabletonton.fr;

        client_max_body_size 10M;

        location ^~ /uploads/ {
            alias /home/deploy/apps/pizza-planner/public/uploads/;
            access_log off;
            add_header Cache-Control "public, max-age=3600";
        }

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        listen 443 ssl; # managed by Certbot
        ssl_certificate /etc/letsencrypt/live/atabletonton.fr/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/atabletonton.fr/privkey.pem; # managed by Certbot
        include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
    }

    server {
        if ($host = www.atabletonton.fr) {
            return 301 https://$host$request_uri;
        } # managed by Certbot

        if ($host = atabletonton.fr) {
            return 301 https://$host$request_uri;
        } # managed by Certbot

        listen 80;
        server_name atabletonton.fr www.atabletonton.fr;
        return 404; # managed by Certbot
    }

Après toute modification Nginx :

    sudo nginx -t
    sudo systemctl reload nginx

---

## 6. Uploads des photos de pizzas

Les photos uploadées depuis l’administration sont enregistrées dans :

    /home/deploy/apps/pizza-planner/public/uploads/pizzas

Elles sont servies publiquement via :

    https://atabletonton.fr/uploads/pizzas/nom-du-fichier

Nginx sert directement /uploads/ grâce à ce bloc :

    location ^~ /uploads/ {
        alias /home/deploy/apps/pizza-planner/public/uploads/;
        access_log off;
        add_header Cache-Control "public, max-age=3600";
    }

Cela évite de devoir redémarrer Next.js après chaque nouvel upload.

La taille maximale d’upload est réglée dans Nginx par :

    client_max_body_size 10M;

Si l’upload échoue avec une erreur du type :

    Unexpected token '<', "<html>..."

ou une erreur :

    413 Request Entity Too Large

vérifier cette directive dans la configuration Nginx.

---

## 7. Droits nécessaires pour les uploads

Nginx doit pouvoir traverser les dossiers parents et lire les fichiers uploadés.

Commandes utilisées pour corriger les droits :

    sudo chmod o+x /home/deploy
    sudo chmod o+x /home/deploy/apps
    sudo chmod o+x /home/deploy/apps/pizza-planner
    sudo chmod o+x /home/deploy/apps/pizza-planner/public
    sudo chmod -R o+rX /home/deploy/apps/pizza-planner/public/uploads

Vérifier les droits d’un fichier uploadé :

    namei -l /home/deploy/apps/pizza-planner/public/uploads/pizzas/NOM_DU_FICHIER

Tester l’accès public :

    curl -I https://atabletonton.fr/uploads/pizzas/NOM_DU_FICHIER

Résultat attendu :

    HTTP/1.1 200 OK
    Server: nginx/1.24.0 (Ubuntu)
    Content-Type: image/png

Il ne doit pas y avoir :

    X-Powered-By: Next.js

Si X-Powered-By: Next.js apparaît, cela signifie que la requête passe encore par Next.js au lieu d’être servie directement par Nginx.

---

## 8. Vérifier la configuration Nginx complète

Afficher le fichier actif :

    sudo cat /etc/nginx/sites-available/atabletonton

Tester la syntaxe :

    sudo nginx -t

Vérifier qu’il n’y a pas de doublon de server_name :

    sudo nginx -T 2>&1 | grep -n "server_name atabletonton.fr www.atabletonton.fr"

Il doit normalement y avoir deux occurrences :
- une pour le bloc HTTPS ;
- une pour le bloc HTTP de redirection.

Vérifier que le bloc /uploads/ est actif :

    sudo nginx -T 2>&1 | grep -n -A 8 -B 4 "location \^~ /uploads"

---

## 9. Déploiement depuis le PC local

En local, avant de pousser :

    cd "$env:USERPROFILE\A_TABLE_TONTON\PIZZA_PLANNER"

    git status
    npm run build

Si next-env.d.ts est modifié par le build :

    git restore next-env.d.ts

Ajouter les fichiers modifiés :

    git add .

Créer un commit :

    git commit -m "Message du commit"

Pousser vers GitHub :

    git push origin main

Puis sur le serveur :

    cd /home/deploy/apps/pizza-planner
    git restore next-env.d.ts
    git pull origin main
    npm install
    npm run build
    sudo systemctl restart pizza-planner
    sudo systemctl status pizza-planner --no-pager

---

## 10. Pages importantes

Pages publiques :

    /
    /carte
    /mentions-legales
    /politique-confidentialite

Espace business :

    /business/login
    /business
    /business/prise
    /business/cuisine
    /business/demandes
    /business/admin

Administration des pizzas :

    /admin/pizzas

API publiques importantes :

    /api/quote
    /api/public/request

API protégées importantes :

    /api/admin/*
    /api/orders
    /api/quote/orders

---

## 11. Flux des demandes client

Depuis /carte, sur ordinateur, le client n’envoie pas directement une commande définitive.

Le flux est :

1. Le client remplit sa demande sur /carte.
2. La demande est enregistrée dans les demandes client.
3. Elle apparaît dans /business/demandes.
4. Elle peut être contrôlée manuellement.
5. Elle peut ensuite être convertie en commande.
6. Une fois convertie, elle apparaît dans /business/prise et /business/cuisine.

Sur mobile, le bouton ouvre l’application SMS avec un message généré.

---

## 12. Points à ne pas oublier

- Le serveur déploie la branche main.
- Après un git pull, toujours faire npm run build.
- Après le build, redémarrer pizza-planner avec systemd.
- Les uploads sont servis par Nginx, pas par Next.js.
- Le fichier next-env.d.ts peut être modifié automatiquement : ne pas le committer inutilement.
- Ne pas committer les fichiers .env, env.local ou secrets.