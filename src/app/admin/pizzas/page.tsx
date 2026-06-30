import BusinessSectionNav from "@/components/business-navigation";
import AdminPizzaForm from "@/components/admin-pizza-form";
import { getAllPizzasForAdmin } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPizzasPage() {
  const pizzas = await getAllPizzasForAdmin();

  return (
    <main className="page">
      <header className="page-header">
        <h1>Administration de la carte</h1>
        <p>
          Clique sur une pizza à droite pour l&apos;éditer immédiatement à gauche.
        </p>

        <BusinessSectionNav
          section="site-admin"
          currentHref="/admin/pizzas"
          extraLinks={[{ href: "/carte", label: "Voir la carte publique" }]}
        />
      </header>

      <AdminPizzaForm initialPizzas={pizzas} />
    </main>
  );
}
