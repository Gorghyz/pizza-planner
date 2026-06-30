import BusinessSectionNav from "@/components/business-navigation";
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

        <BusinessSectionNav
          section="site-admin"
          currentHref="/business/admin/image-accueil"
          extraLinks={[{ href: "/", label: "Voir la page d'accueil" }]}
        />
      </header>

      <HomeImageAdmin initialImages={images} />
    </main>
  );
}
