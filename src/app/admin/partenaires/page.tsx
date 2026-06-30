import BusinessSectionNav from "@/components/business-navigation";
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

        <BusinessSectionNav
          section="site-admin"
          currentHref="/admin/partenaires"
          extraLinks={[{ href: "/nos-partenaires", label: "Voir la page publique" }]}
        />
      </header>

      <AdminPartnerForm initialPartners={partners} />
    </main>
  );
}
