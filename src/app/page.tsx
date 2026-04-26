import Link from "next/link";

export default function PublicHomePage() {
  return (
    <main className="page public-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <h1>Bienvenue chez Tonton !</h1>
          <p>
            Accédez à notre carte mise à jour, explorez notre univers et passez
            votre commande au 06-79-95-89-62 !
          </p>

          <div className="page-actions">
            <Link href="/carte" className="link-button">
              Voir la carte
            </Link>
          </div>
        </div>

        <div className="card feature-card">
          <h2>Commande en ligne</h2>
          <p>
            La fonction de commande en ligne est à venir. Pour le moment, la
            prise de commande se fait par téléphone.
          </p>
        </div>
      </section>

      <section className="feature-grid">
        <article className="card feature-card">
          <h2>Au fil des saisons</h2>
          <p>
            Redécouvrez vos classiques, et explorez notre univers avec des
            pizzas différentes en fonction des saisons !
          </p>
        </article>

        <Link href="/transparence" className="card feature-card feature-link-card">
          <h2>Qu&apos;est-ce que vous achetez ?</h2>
          <p>
            Une page dédiée à la transparence sur le coût réel d&apos;une pizza
            sera développée ici.
          </p>
        </Link>

        <Link
          href="/qui-nous-sommes"
          className="card feature-card feature-link-card"
        >
          <h2>Qui nous sommes ?</h2>
          <p>
            Découvrez qui nous sommes, ce que nous faisons par ailleurs, et nos
            ambitions.
          </p>
        </Link>
      </section>
    </main>
  );
}