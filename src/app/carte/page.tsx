import type { Metadata } from "next";

import PublicCarteBuilder from "@/components/public-carte-builder";
import PublicSiteShell from "@/components/public-site-shell";
import { getActivePizzas } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carte et commande",
  description:
    "Consultez la carte d’À table tonton ! et préparez votre demande de pizzas à Marval, avec choix des pizzas, créneau souhaité et confirmation.",
  alternates: {
    canonical: "/carte",
  },
  openGraph: {
    title: "Carte et commande — À table tonton !",
    description:
      "Choisissez vos pizzas, indiquez votre créneau souhaité et préparez votre demande simplement.",
    url: "/carte",
    type: "website",
  },
};

export default async function CartePage() {
  const pizzas = await getActivePizzas();

  return (
    <PublicSiteShell currentPage="carte">
      <section
        aria-labelledby="carte-title"
        style={{
          padding: "34px 0 32px",
        }}
      >
        <h1
          id="carte-title"
          style={{
            position: "absolute",
            width: "1px",
            height: "1px",
            padding: 0,
            margin: "-1px",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          La carte
        </h1>

        <img
          src="/assets/carte-hero-illustration.svg"
          alt=""
          aria-hidden="true"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />
      </section>

      <PublicCarteBuilder pizzas={pizzas} />
    </PublicSiteShell>
  );
}