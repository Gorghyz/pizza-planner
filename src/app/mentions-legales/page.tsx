import PublicSiteShell from "@/components/public-site-shell";

export const metadata = {
  title: "Mentions légales — À table tonton !",
  description:
    "Mentions légales du site atabletonton.fr et de l’activité À table tonton !",
};

export default function MentionsLegalesPage() {
  return (
    <PublicSiteShell currentPage="legal">
      <article
        className="att-ink-card"
        style={{
          maxWidth: "920px",
          margin: "48px auto",
          padding: "clamp(24px, 5vw, 54px)",
          lineHeight: 1.7,
        }}
      >
        <h1
          style={{
            margin: "0 0 32px",
            fontFamily:
              '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive',
            fontSize: "clamp(2.2rem, 5vw, 4rem)",
            lineHeight: 1,
            letterSpacing: "-0.07em",
            transform: "rotate(-1deg)",
          }}
        >
          Mentions légales
        </h1>

        <section>
          <h2>Éditeur du site</h2>

          <p>Le site atabletonton.fr est édité par :</p>

          <p>
            Guillaume Savard
            <br />
            Entreprise individuelle
            <br />
            Nom commercial : À table tonton !
            <br />
            Adresse : 35 La Varlanchie, 87440 Marval
            <br />
            SIREN : 944 004 704
            <br />
            Email :{" "}
            <a href="mailto:contact@atabletonton.fr">
              contact@atabletonton.fr
            </a>
          </p>
        </section>

        <section>
          <h2>Activité</h2>

          <p>
            À table tonton ! est une activité de restauration ambulante,
            principalement autour de la pizza artisanale, avec possibilité de
            proposer d’autres préparations selon les événements, les saisons et
            les envies du moment.
          </p>
        </section>

        <section>
          <h2>Hébergement</h2>

          <p>Le site est hébergé par :</p>

          <p>
            Nom de l’hébergeur : Hetzner
            <br />
            Adresse : Hetzner Online GmbH
            <br />
            Industriestr. 25
            <br />
            91710 Gunzenhausen
            <br />
            Germany
            <br />
            Site web :{" "}
            <a href="https://hetzner.com/" target="_blank" rel="noreferrer">
              https://hetzner.com/
            </a>
          </p>
        </section>

        <section>
          <h2>Propriété intellectuelle</h2>

          <p>
            Les textes, images, illustrations, logos, éléments graphiques et
            contenus présents sur le site atabletonton.fr appartiennent à À table
            tonton !, sauf mention contraire.
          </p>

          <p>
            Toute reproduction, modification ou réutilisation de ces éléments
            sans autorisation préalable est interdite.
          </p>
        </section>

        <section>
          <h2>Responsabilité</h2>

          <p>
            Le site a pour objectif de présenter l’activité, la carte, les
            informations pratiques et de faciliter la prise de contact ou la
            demande de commande.
          </p>

          <p>
            Les informations affichées sur le site peuvent évoluer : carte, prix,
            horaires, lieux de présence, disponibilités, recettes ou ingrédients.
            Nous faisons notre possible pour les tenir à jour, mais une erreur
            ou un oubli peut toujours arriver.
          </p>

          <p>
            En cas de doute, le mieux reste de nous contacter directement.
          </p>
        </section>
      </article>
    </PublicSiteShell>
  );
}