import Link from "next/link";
import PublicCarteBuilder from "@/components/public-carte-builder";
import { getActivePizzas } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CartePage() {
  const pizzas = await getActivePizzas();

  return (
    <main className="page public-page">
      <header className="page-header">
        <h1>La carte des pizzas</h1>
        <p>
          Choisissez vos pizzas, indiquez l&apos;heure souhaitée, puis
          sélectionnez un créneau disponible. Sur smartphone, vous pouvez
          préparer un SMS. Sur ordinateur, vous pouvez envoyer une demande
          enregistrée que nous traiterons manuellement.
        </p>

        <div className="page-actions">
          <Link href="/" className="link-button secondary-link">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <PublicCarteBuilder pizzas={pizzas} />
    </main>
  );
}