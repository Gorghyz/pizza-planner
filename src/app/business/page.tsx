import Link from "next/link";

import BusinessLogoutButton from "@/components/business-logout-button";

const ORDER_LINKS = [
  {
    href: "/business/prise",
    title: "Prise de commande",
    description:
      "Enregistrer les commandes, proposer les créneaux et consulter le planning du soir.",
  },
  {
    href: "/business/cuisine",
    title: "Vue cuisine",
    description:
      "Voir les commandes du jour avec code couleur temporel et statut.",
  },
  {
    href: "/business/demandes",
    title: "Demandes clients",
    description:
      "Consulter les demandes envoyées depuis ordinateur avant confirmation manuelle.",
  },
];

const SITE_ADMIN_LINKS = [
  {
    href: "/admin/pizzas",
    title: "Administration de la carte",
    description:
      "Créer, éditer, activer ou désactiver les pizzas, avec prix, saisonnalité, photo et allergènes.",
  },
  {
    href: "/admin/partenaires",
    title: "Gérer les partenaires",
    description:
      "Créer, éditer, afficher ou masquer les producteurs, distributeurs et partenaires visibles sur le site public.",
  },
  {
    href: "/business/admin/image-accueil",
    title: "Image d'accueil",
    description:
      "Ajouter les bandeaux de pizzas et choisir l'image active sur la page d'accueil.",
  },
  {
    href: "/business/evenements",
    title: "Événements",
    description:
      "Créer les ouvertures spéciales, leurs images, leur carte dédiée et leurs précommandes.",
  },
  {
    href: "/business/calendrier",
    title: "Calendrier d'ouverture",
    description:
      "Voir les jours ouverts, poser des fermetures exceptionnelles et ajouter des ouvertures ponctuelles.",
  },
  {
    href: "/business/admin",
    title: "Réglages business",
    description:
      "Gérer les lieux d'ouverture, les jours, les horaires et les informations affichées côté client.",
  },
];

function BusinessLinkGrid({
  links,
}: {
  links: typeof ORDER_LINKS | typeof SITE_ADMIN_LINKS;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 14,
      }}
    >
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="business-card">
          <h2>{link.title}</h2>
          <p>{link.description}</p>
        </Link>
      ))}
    </div>
  );
}

export default function BusinessHomePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Espace business</h1>

        <p>
          Accès protégé pour la prise de commande, la cuisine, les demandes
          clients, l&apos;administration de la carte, les partenaires et les réglages
          business.
        </p>

        <div className="page-actions">
          <BusinessLogoutButton />
        </div>
      </header>

      <div style={{ display: "grid", gap: 22 }}>
        <section className="card">
          <h2>Gestion des commandes clients</h2>
          <p className="small" style={{ marginTop: -4, marginBottom: 16 }}>
            Les outils utiles pendant le service : prise de commande, suivi cuisine
            et demandes reçues depuis le site.
          </p>

          <BusinessLinkGrid links={ORDER_LINKS} />
        </section>

        <section className="card">
          <h2>Administration du site</h2>
          <p className="small" style={{ marginTop: -4, marginBottom: 16 }}>
            Les réglages qui structurent le site public : carte, partenaires,
            image d&apos;accueil, lieux et horaires.
          </p>

          <BusinessLinkGrid links={SITE_ADMIN_LINKS} />
        </section>
      </div>
    </main>
  );
}
