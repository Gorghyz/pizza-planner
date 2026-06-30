import Link from "next/link";

import BusinessLogoutButton from "@/components/business-logout-button";

type BusinessSection = "orders" | "site-admin";

type BusinessNavItem = {
  href: string;
  label: string;
};

type BusinessSectionNavProps = {
  section: BusinessSection;
  currentHref: string;
  extraLinks?: BusinessNavItem[];
  showLogout?: boolean;
};

const ORDER_NAV_ITEMS: BusinessNavItem[] = [
  {
    href: "/business/prise",
    label: "Prise de commande",
  },
  {
    href: "/business/cuisine",
    label: "Vue cuisine",
  },
  {
    href: "/business/demandes",
    label: "Demandes clients",
  },
];

const SITE_ADMIN_NAV_ITEMS: BusinessNavItem[] = [
  {
    href: "/admin/pizzas",
    label: "Carte",
  },
  {
    href: "/admin/partenaires",
    label: "Partenaires",
  },
  {
    href: "/business/admin/image-accueil",
    label: "Image d'accueil",
  },
  {
    href: "/business/evenements",
    label: "Événements",
  },
  {
    href: "/business/calendrier",
    label: "Calendrier",
  },
  {
    href: "/business/admin",
    label: "Réglages business",
  },
];

function getNavItems(section: BusinessSection): BusinessNavItem[] {
  return section === "orders" ? ORDER_NAV_ITEMS : SITE_ADMIN_NAV_ITEMS;
}

function getAriaLabel(section: BusinessSection): string {
  return section === "orders"
    ? "Navigation du pôle gestion des commandes clients"
    : "Navigation du pôle administration du site";
}

export default function BusinessSectionNav({
  section,
  currentHref,
  extraLinks = [],
  showLogout = true,
}: BusinessSectionNavProps) {
  const navItems = getNavItems(section);

  return (
    <div className="page-actions" aria-label={getAriaLabel(section)}>
      <Link href="/business" className="link-button secondary-link">
        Accueil business
      </Link>

      {navItems.map((item) => {
        const isCurrent = item.href === currentHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isCurrent ? "link-button" : "link-button secondary-link"}
            aria-current={isCurrent ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      {extraLinks.map((item) => (
        <Link key={item.href} href={item.href} className="link-button secondary-link">
          {item.label}
        </Link>
      ))}

      {showLogout ? <BusinessLogoutButton /> : null}
    </div>
  );
}
