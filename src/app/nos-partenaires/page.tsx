import PublicSiteShell from "@/components/public-site-shell";
import { getPublicPartnersRandomized } from "@/lib/partners";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS = {
  producteur: "Producteur",
  distributeur: "Distributeur",
  partenaire: "Partenaire",
};

export const metadata = {
  title: "Nos partenaires — Producteurs, artisans et distributeurs",
  description:
    "Découvrez les producteurs, artisans, distributeurs et partenaires d’À table tonton ! autour de Marval, en Haute-Vienne, en Dordogne et dans les territoires voisins.",
};

export default async function NosPartenairesPage() {
  const partners = await getPublicPartnersRandomized();

  return (
    <PublicSiteShell currentPage="partners">
      <article
        className="att-ink-card"
        style={{
          maxWidth: "980px",
          margin: "48px auto 34px",
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
          Nos partenaires
        </h1>

        <p>
          Chez À table tonton !, nous cherchons de bons produits, savoureux,
          aussi proches que possible, respectueux de la terre et proposés au
          meilleur prix.
        </p>

        <p>
          Notre objectif est simple : servir la meilleure qualité possible, à un
          prix qui reste accessible.
        </p>

        <p>
          Pour y arriver, nous faisons des choix concrets : une carte courte pour
          limiter le gaspillage, des recettes qui évoluent avec les saisons, des
          achats réfléchis, et des commandes plus importantes pour certains
          produits de longue conservation quand cela permet de réduire les coûts.
        </p>

        <p>
          Nous privilégions les producteurs, artisans et distributeurs qui
          travaillent sérieusement, avec une vraie attention portée au goût, aux
          produits, aux saisons et aux conditions de production. Quand le local
          est possible, nous le choisissons. Quand il ne l’est pas, nous
          cherchons l’option la plus cohérente.
        </p>

        <p>
          Autour de Marval, entre Haute-Vienne, Dordogne et territoires voisins,
          nous cherchons des partenaires capables de nous aider à proposer des
          pizzas originales, généreuses et accessibles.
        </p>

        <p>
          Cette page présente celles et ceux avec qui nous travaillons :
          producteurs, fermes, artisans, moulins, distributeurs ou petites
          entreprises. Certains sont tout près, d’autres un peu plus loin. Tous
          ont été choisis pour une raison.
        </p>

        <h2>Ce que nous cherchons encore</h2>

        <p>
          Nous n’avons pas encore trouvé de solution pleinement satisfaisante pour
          tous les produits. C’est le cas, par exemple, de la mozzarella fraîche,
          de la burrata, de la stracciatella ou encore des pistaches.
        </p>

        <p>
          Si vous connaissez une bonne piste — producteur, artisan, coopérative,
          distributeur sérieux — nous serons heureux d’en entendre parler.
        </p>

        <p>
          Notre démarche est simple : mieux choisir, mieux acheter, moins
          gaspiller, et partager avec vous ce que nous découvrons en chemin.
        </p>
      </article>

      <section
        aria-labelledby="partners-list-title"
        style={{
          maxWidth: "1120px",
          margin: "0 auto 54px",
        }}
      >
        <h2
          id="partners-list-title"
          className="att-section-title"
          style={{
            marginTop: 0,
          }}
        >
          Producteurs, distributeurs & partenaires
        </h2>

        {partners.length === 0 ? (
          <article
            className="att-ink-card"
            style={{
              padding: "28px",
              textAlign: "center",
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            Les fiches partenaires seront ajoutées progressivement.
          </article>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              alignItems: "stretch",
            }}
          >
            {partners.map((partner) => (
              <article
                key={partner.id}
                className="att-ink-card"
                style={{
                  overflow: "hidden",
                  background: "rgba(255, 253, 248, 0.94)",
                }}
              >
                {partner.photoPath ? (
                  <img
                    src={partner.photoPath}
                    alt={partner.name}
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 9",
                      objectFit: "cover",
                      borderBottom: "2px solid #111111",
                      display: "block",
                    }}
                  />
                ) : null}

                <div
                  style={{
                    padding: "22px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 10px",
                      fontSize: "0.82rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {CATEGORY_LABELS[partner.category]}
                  </p>

                  <h3
                    style={{
                      margin: "0 0 16px",
                      fontFamily:
                        '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive',
                      fontSize: "1.8rem",
                      lineHeight: 1,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {partner.name}
                  </h3>

                  <div
                    style={{
                      whiteSpace: "pre-line",
                      fontWeight: 700,
                      lineHeight: 1.58,
                    }}
                  >
                    {partner.description}
                  </div>

                  {partner.contactEnabled ? (
                    <aside
                      style={{
                        marginTop: "20px",
                        borderTop: "2px dashed rgba(17, 17, 17, 0.45)",
                        paddingTop: "16px",
                        fontWeight: 700,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>Contact</strong>

                      {partner.contactEmail ? (
                        <>
                          <br />
                          <a href={`mailto:${partner.contactEmail}`}>
                            {partner.contactEmail}
                          </a>
                        </>
                      ) : null}

                      {partner.contactPhone ? (
                        <>
                          <br />
                          <a href={`tel:${partner.contactPhone}`}>
                            {partner.contactPhone}
                          </a>
                        </>
                      ) : null}

                      {partner.contactAddress ? (
                        <>
                          <br />
                          <span style={{ whiteSpace: "pre-line" }}>
                            {partner.contactAddress}
                          </span>
                        </>
                      ) : null}
                    </aside>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PublicSiteShell>
  );
}