import Link from "next/link";

import BusinessLogoutButton from "@/components/business-logout-button";
import HomeImageAdmin from "@/components/home-image-admin";
import { getAllHomeImagesForAdmin } from "@/lib/home-images";

export const dynamic = "force-dynamic";

export default async function HomeImageAdminPage() {
  const images = await getAllHomeImagesForAdmin();

  return (
    <main className="page">
      <header className="page-header">
        <h1>Image d&apos;accueil</h1>
        <p>
          Gère le bandeau de pizzas affiché sur la page d&apos;accueil. Les images
          envoyées restent disponibles pour être réactivées plus tard.
        </p>

        <div className="page-actions">
          <Link href="/business" className="link-button secondary-link">
            Accueil business
          </Link>
          <Link href="/business/admin" className="link-button secondary-link">
            Réglages business
          </Link>
          <Link href="/" className="link-button">
            Voir la page d&apos;accueil
          </Link>
          <BusinessLogoutButton />
        </div>
      </header>

      <HomeImageAdmin initialImages={images} />
    </main>
  );
}