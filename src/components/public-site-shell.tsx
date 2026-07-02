import Link from "next/link";
import type { ReactNode } from "react";

const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61588844054910";

type PublicSiteShellProps = {
  children: ReactNode;
  currentPage?: "home" | "carte" | "legal" | "partners";
};

function PublicHeader({ currentPage }: Pick<PublicSiteShellProps, "currentPage">) {
  const isHome = currentPage === "home";
  const isLegal = currentPage === "legal";

  return (
    <header className="att-public-header">
      <Link
        href="/"
        className="att-public-logo-link"
        aria-label="Accueil À table tonton !"
      >
        <img
          src="/assets/logo-header.svg"
          alt="À table tonton !"
          className="att-public-logo"
        />
      </Link>

      <nav className="att-public-nav" aria-label="Navigation principale">
        {isLegal ? (
          <>
            <Link href="/" className="att-public-nav-cta">
              Accueil
            </Link>

            <Link
              href="/carte"
              className="att-public-nav-cta"
              data-analytics-event="nav_click"
              data-analytics-label="Voir la carte / Commander"
              data-analytics-target="/carte"
            >
              Voir la carte / Commander
            </Link>
          </>
        ) : (
          <Link
            href="/carte"
            className="att-public-nav-cta"
            aria-current={currentPage === "carte" ? "page" : undefined}
            data-analytics-event="nav_click"
            data-analytics-label="Voir la carte / Commander"
            data-analytics-target="/carte"
          >
            Voir la carte / Commander
          </Link>
        )}

        {isHome ? (
          <>
            <a href="#ou-nous-trouver" data-analytics-event="nav_click" data-analytics-label="Où nous trouver" data-analytics-target="#ou-nous-trouver">Où nous trouver</a>
            <a href="#qui-sommes-nous" data-analytics-event="nav_click" data-analytics-label="Qui sommes-nous ?" data-analytics-target="#qui-sommes-nous">Qui sommes-nous ?</a>
            <a href="#nos-valeurs" data-analytics-event="nav_click" data-analytics-label="Nos valeurs" data-analytics-target="#nos-valeurs">Nos valeurs</a>
            <Link href="/nos-partenaires" data-analytics-event="nav_click" data-analytics-label="Nos partenaires" data-analytics-target="/nos-partenaires">Nos partenaires</Link>
          </>
        ) : isLegal ? null : (
          <>
            <Link href="/" data-analytics-event="nav_click" data-analytics-label="Accueil" data-analytics-target="/">Accueil</Link>
            <Link href="/#qui-sommes-nous" data-analytics-event="nav_click" data-analytics-label="Qui sommes-nous ?" data-analytics-target="/#qui-sommes-nous">Qui sommes-nous ?</Link>
            <Link href="/#nos-valeurs" data-analytics-event="nav_click" data-analytics-label="Nos valeurs" data-analytics-target="/#nos-valeurs">Nos valeurs</Link>
            <Link
              href="/nos-partenaires"
              aria-current={currentPage === "partners" ? "page" : undefined}
              data-analytics-event="nav_click"
              data-analytics-label="Nos partenaires"
              data-analytics-target="/nos-partenaires"
            >
              Nos partenaires
            </Link>
          </>
        )}

        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noreferrer"
          className="att-facebook-icon-link"
          aria-label="Suivez-nous sur Facebook"
          data-analytics-event="external_click"
          data-analytics-label="Facebook header"
          data-analytics-target="facebook"
        >
          <img
            src="/assets/icon-facebook.svg"
            alt=""
            aria-hidden="true"
          />
        </a>
      </nav>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="att-public-footer">
      <div className="att-public-footer-inner">
        <Link
          href="/"
          className="att-public-footer-logo-link"
          aria-label="Accueil À table tonton !"
        >
          <img
            src="/assets/logo-header.svg"
            alt="À table tonton !"
            className="att-public-footer-logo"
          />
        </Link>

        <a
          href={FACEBOOK_URL}
          target="_blank"
          rel="noreferrer"
          className="att-public-footer-social"
          data-analytics-event="external_click"
          data-analytics-label="Facebook footer"
          data-analytics-target="facebook"
        >
          <span className="att-facebook-icon-link att-public-footer-facebook-icon" aria-hidden="true">
            <img
              src="/assets/icon-facebook.svg"
              alt=""
            />
          </span>
          <span>
            <strong>Suivez-nous</strong>
            <br />
            sur Facebook
          </span>
        </a>

        <div className="att-public-footer-links">
          <strong>Liens utiles</strong>
          <Link href="/nos-partenaires" data-analytics-event="footer_click" data-analytics-label="Nos partenaires" data-analytics-target="/nos-partenaires">Nos partenaires</Link>
          <Link href="/mentions-legales" data-analytics-event="footer_click" data-analytics-label="Mentions légales" data-analytics-target="/mentions-legales">Mentions légales</Link>
          <Link
            href="/politique-confidentialite"
            data-analytics-event="footer_click"
            data-analytics-label="Politique de confidentialité"
            data-analytics-target="/politique-confidentialite"
          >
            Politique de confidentialité
          </Link>
        </div>

        <Link href="/business/login" className="att-public-pro-link">
          Accès pro
        </Link>
      </div>

      <div className="att-public-footer-bottom">
        © À table tonton ! — Tous droits réservés.
      </div>
    </footer>
  );
}

export default function PublicSiteShell({
  children,
  currentPage,
}: PublicSiteShellProps) {
  return (
    <div className="att-public-shell">
      <PublicHeader currentPage={currentPage} />

      <main className="att-public-main">{children}</main>

      <PublicFooter />
    </div>
  );
}