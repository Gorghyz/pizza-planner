import Link from "next/link";
import type { ReactNode } from "react";

type PublicSiteShellProps = {
  children: ReactNode;
  currentPage?: "home" | "carte";
};

function PublicHeader({ currentPage }: Pick<PublicSiteShellProps, "currentPage">) {
  const isHome = currentPage === "home";

  return (
    <header className="att-public-header">
      <Link href="/" className="att-public-logo-link" aria-label="Accueil À table tonton !">
        <img
          src="/assets/logo-header.svg"
          alt="À table tonton !"
          className="att-public-logo"
        />
      </Link>

      <nav className="att-public-nav" aria-label="Navigation principale">
        <Link
          href="/carte"
          className="att-public-nav-cta"
          aria-current={currentPage === "carte" ? "page" : undefined}
        >
          Voir la carte / Commander
        </Link>

        {isHome ? (
          <>
            <a href="#ou-nous-trouver">Où nous trouver</a>
            <a href="#qui-sommes-nous">Qui sommes-nous ?</a>
            <a href="#nos-valeurs">Nos valeurs</a>
          </>
        ) : (
          <>
            <Link href="/">Accueil</Link>
            <Link href="/#qui-sommes-nous">Qui sommes-nous ?</Link>
            <Link href="/#nos-valeurs">Nos valeurs</Link>
          </>
        )}

        <a
          href="https://www.facebook.com/"
          target="_blank"
          rel="noreferrer"
          className="att-facebook-dot"
          aria-label="Suivez-nous sur Facebook"
        >
          f
        </a>
      </nav>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="att-public-footer">
      <div className="att-public-footer-inner">
        <Link href="/" className="att-public-footer-logo-link" aria-label="Accueil À table tonton !">
          <img
            src="/assets/logo-header.svg"
            alt="À table tonton !"
            className="att-public-footer-logo"
          />
        </Link>

        <a
          href="https://www.facebook.com/"
          target="_blank"
          rel="noreferrer"
          className="att-public-footer-social"
        >
          <span className="att-facebook-dot" aria-hidden="true">
            f
          </span>
          <span>
            <strong>Suivez-nous</strong>
            <br />
            sur Facebook
          </span>
        </a>

        <div className="att-public-footer-links">
          <strong>Liens utiles</strong>
          <Link href="/transparence">Politique de confidentialité</Link>
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