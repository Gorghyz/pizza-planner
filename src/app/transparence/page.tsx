import Link from "next/link";

export default function TransparencePage() {
  return (
    <main className="page public-page">
      <header className="page-header">
        <h1>Qu&apos;est-ce que vous achetez ?</h1>
        <p>
          Cette page servira à expliquer de façon transparente le coût réel
          d&apos;une pizza, les matières premières, le travail, l&apos;énergie
          et le reste.
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