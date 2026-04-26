import Link from "next/link";
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
          Clique sur une pizza à droite pour l&apos;éditer immédiatement à
          gauche.
        </p>

        <div className="page-actions">
          <Link href="/business" className="link-button secondary-link">
            Accueil business
          </Link>
          <Link href="/business/prise" className="link-button">
            Prise de commande
          </Link>
          <Link href="/carte" className="link-button secondary-link">
            Voir la carte publique
          </Link>
        </div>
      </header>

      <AdminPizzaForm initialPizzas={pizzas} />
    </main>
  );
}