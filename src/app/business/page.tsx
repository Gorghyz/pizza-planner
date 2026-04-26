import Link from "next/link";

export default function BusinessHomePage() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Espace business</h1>
        <p>
          Accès protégé pour la prise de commande, la cuisine, les demandes
          clients et l&apos;administration de la carte.
        </p>
      </header>

      <div className="business-grid">
        <Link href="/business/prise" className="business-card">
          <h2>Prise de commande</h2>
          <p>
            Enregistrer les commandes, proposer les créneaux et consulter le
            planning du soir.
          </p>
        </Link>

        <Link href="/business/cuisine" className="business-card">
          <h2>Vue cuisine</h2>
          <p>
            Voir les commandes du jour avec code couleur temporel et statut.
          </p>
        </Link>

        <Link href="/business/demandes" className="business-card">
          <h2>Demandes clients</h2>
          <p>
            Consulter les demandes envoyées depuis ordinateur avant confirmation
            manuelle.
          </p>
        </Link>

        <Link href="/admin/pizzas" className="business-card">
          <h2>Administration de la carte</h2>
          <p>
            Créer, éditer, activer ou désactiver les pizzas, avec prix,
            saisonnalité, photo et allergènes.
          </p>
        </Link>
      </div>
    </main>
  );
}