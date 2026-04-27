import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BusinessLoginForm from "@/components/business-login-form";
import {
  BUSINESS_SESSION_COOKIE,
  isBusinessSessionValid,
  sanitizeNextPath,
} from "@/lib/auth";

type BusinessLoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function BusinessLoginPage({
  searchParams,
}: BusinessLoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const cookieStore = await cookies();
  const token = cookieStore.get(BUSINESS_SESSION_COOKIE)?.value;

  if (isBusinessSessionValid(token)) {
    redirect(nextPath);
  }

  return (
    <main className="page" style={{ maxWidth: 520 }}>
      <header className="page-header">
        <h1>Connexion business</h1>
        <p>
          Connecte-toi pour accéder à la prise de commande, à la cuisine et à
          l&apos;administration.
        </p>
      </header>

      <section className="card">
        <h2>Accès sécurisé</h2>
        <BusinessLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}