import PublicSiteShell from "@/components/public-site-shell";

export const metadata = {
  title: "Politique de confidentialité — À table tonton !",
  description:
    "Politique de confidentialité du site atabletonton.fr et de l’activité À table tonton !",
};

export default function PolitiqueConfidentialitePage() {
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
          Politique de confidentialité
        </h1>

        <section>
          <h2>Une politique simple</h2>

          <p>
            Chez À table tonton !, on ne collecte que les informations utiles
            pour répondre aux demandes, préparer les commandes et organiser le
            service.
          </p>

          <p>
            L’idée est simple : prendre votre demande correctement, vous répondre
            si besoin, et éviter les erreurs au moment de la préparation ou du
            retrait.
          </p>
        </section>

        <section>
          <h2>Données que nous pouvons collecter</h2>

          <p>
            Lorsque vous utilisez le site, envoyez une demande de commande ou
            nous contactez, nous pouvons être amenés à collecter certaines
            informations, par exemple :
          </p>

          <ul>
            <li>votre nom ou prénom, si vous le donnez ;</li>
            <li>votre numéro de téléphone ;</li>
            <li>le contenu de votre demande ou de votre commande ;</li>
            <li>l’horaire souhaité ;</li>
            <li>
              les échanges nécessaires pour confirmer ou préciser la demande.
            </li>
          </ul>

          <p>Ces informations ne sont pas publiées sur le site.</p>
        </section>

        <section>
          <h2>À quoi servent ces données ?</h2>

          <p>Ces données servent uniquement à :</p>

          <ul>
            <li>traiter votre demande ;</li>
            <li>préparer votre commande ;</li>
            <li>
              vous contacter en cas de question, de changement ou de
              confirmation nécessaire ;
            </li>
            <li>organiser le service ;</li>
            <li>
              établir des statistiques internes, une fois les données
              anonymisées.
            </li>
          </ul>

          <p>Nous ne revendons pas vos données.</p>

          <p>
            Nous ne les partageons pas avec des tiers à des fins commerciales.
          </p>
        </section>

        <section>
          <h2>Durée de conservation</h2>

          <p>
            Les données nominatives liées à une demande ou une commande sont
            conservées le temps nécessaire au traitement de la commande, puis
            pendant une durée maximale de 1 an.
          </p>

          <p>
            Passé ce délai, les informations permettant de vous identifier sont
            supprimées ou anonymisées.
          </p>

          <p>
            Certaines données anonymisées peuvent être conservées plus longtemps
            à des fins statistiques : nombre de commandes, types de produits
            vendus, volumes d’activité, organisation du service, etc.
          </p>
        </section>

        <section>
          <h2>Sécurité</h2>

          <p>
            Nous faisons notre possible pour conserver les données de manière
            raisonnablement sécurisée, avec des accès limités aux personnes qui
            en ont besoin pour faire fonctionner l’activité.
          </p>

          <p>
            Aucune donnée personnelle n’est destinée à être rendue publique.
          </p>
        </section>

        <section>
          <h2>Vos droits</h2>

          <p>
            Vous pouvez demander à accéder aux données vous concernant, les faire
            corriger ou demander leur suppression lorsque cela est possible.
          </p>

          <p>Pour toute demande, vous pouvez écrire à :</p>

          <p>
            <a href="mailto:contact@atabletonton.fr">
              contact@atabletonton.fr
            </a>
          </p>

          <p>Nous ferons au mieux pour répondre simplement et rapidement.</p>
        </section>

        <section>
          <h2>Cookies et suivi</h2>

          <p>
            Le site atabletonton.fr n’a pas vocation à suivre les visiteurs
            inutilement.
          </p>

          <p>
            Si des outils de mesure d’audience ou des cookies sont ajoutés plus
            tard, cette politique sera mise à jour pour l’indiquer clairement.
          </p>
        </section>

        <section>
          <h2>Mise à jour</h2>

          <p>
            Cette politique de confidentialité peut être modifiée si le site
            évolue, si de nouvelles fonctionnalités sont ajoutées, ou si
            l’organisation de l’activité change.
          </p>

          <p>
            <strong>Dernière mise à jour : mai 2026.</strong>
          </p>
        </section>
      </article>
    </PublicSiteShell>
  );
}