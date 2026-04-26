import Link from "next/link";

export default function QuiNousSommesPage() {
  return (
    <main className="page public-page">
      <header className="page-header">
        <h1>Qui nous sommes ?</h1>
        <p>
          Cette page présentera qui vous êtes, ce que vous faites par ailleurs,
          et les ambitions du projet.
        </p>

        <div className="page-actions">
          <Link href="/" className="link-button secondary-link">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <section className="card">
        <p className="empty">
          Contenu à rédiger plus tard.
        </p>
      </section>
    </main>
  );
}