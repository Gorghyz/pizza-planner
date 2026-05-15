import Link from "next/link";

import AdminPartnerForm from "@/components/admin-partner-form";
import { getAllPartnersForAdmin } from "@/lib/partners";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const partners = await getAllPartnersForAdmin();

  return (
    <main className="page">
      <header className="page-header">
        <h1>Administration des partenaires</h1>

        <p>
          Crée, modifie, affiche ou masque les fiches partenaires visibles sur la
          page publique.
        </p>

        <div className="page-actions">
          <Link href="/business" className="link-button secondary-link">
            Accueil business
          </Link>

          <Link href="/admin/pizzas" className="link-button secondary-link">
            Administration de la carte
          </Link>

          <Link href="/nos-partenaires" className="link-button">
            Voir la page publique
          </Link>
        </div>
      </header>

      <AdminPartnerForm initialPartners={partners} />
    </main>
  );
}