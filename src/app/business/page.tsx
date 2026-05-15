import Link from "next/link";

import BusinessLogoutButton from "@/components/business-logout-button";

export default function BusinessHomePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Espace business</h1>

        <p>
          Accès protégé pour la prise de commande, la cuisine, les demandes
          clients, l&apos;administration de la carte, les partenaires et les
          réglages business.
        </p>

        <div className="page-actions">
          <BusinessLogoutButton />
        </div>
      </header>

      <section className="feature-grid">
        <Link href="/business/prise" className="card feature-card feature-link-card">
          <h2>Prise de commande</h2>
          <p>
            Enregistrer les commandes, proposer les créneaux et consulter le
            planning du soir.
          </p>
        </Link>

        <Link href="/business/cuisine" className="card feature-card feature-link-card">
          <h2>Vue cuisine</h2>
          <p>
            Voir les commandes du jour avec code couleur temporel et statut.
          </p>
        </Link>

        <Link
          href="/business/demandes"
          className="card feature-card feature-link-card"
        >
          <h2>Demandes clients</h2>
          <p>
            Consulter les demandes envoyées depuis ordinateur avant confirmation
            manuelle.
          </p>
        </Link>

        <Link href="/admin/pizzas" className="card feature-card feature-link-card">
          <h2>Administration de la carte</h2>
          <p>
            Créer, éditer, activer ou désactiver les pizzas, avec prix,
            saisonnalité, photo et allergènes.
          </p>
        </Link>

        <Link
          href="/admin/partenaires"
          className="card feature-card feature-link-card"
        >
          <h2>Gérer les partenaires</h2>
          <p>
            Créer, éditer, afficher ou masquer les producteurs, distributeurs et
            partenaires visibles sur le site public.
          </p>
        </Link>

        <Link href="/business/admin" className="card feature-card feature-link-card">
          <h2>Réglages business</h2>
          <p>
            Gérer les lieux d&apos;ouverture, les jours, les horaires et les
            informations affichées côté client.
          </p>
        </Link>
      </section>
    </main>
  );
}