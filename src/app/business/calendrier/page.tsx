import BusinessCalendarAdmin from "@/components/business-calendar-admin";
import BusinessSectionNav from "@/components/business-navigation";
import {
  buildBusinessCalendarDays,
  getCalendarExceptionsForRange,
  getCalendarGridRange,
  getMonthNavigation,
} from "@/lib/business-calendar";
import { getBusinessLocationsWithHours } from "@/lib/data";
import { getBusinessEventsForAdmin } from "@/lib/events";

export const dynamic = "force-dynamic";

type BusinessCalendarPageProps = {
  searchParams?: Promise<{
    mois?: string;
  }>;
};

export default async function BusinessCalendarPage({
  searchParams,
}: BusinessCalendarPageProps) {
  const params = (await searchParams) ?? {};
  const month = typeof params.mois === "string" ? params.mois : undefined;
  const navigation = getMonthNavigation(month);
  const range = getCalendarGridRange(month);

  const [locations, exceptions, events] = await Promise.all([
    getBusinessLocationsWithHours(),
    getCalendarExceptionsForRange(range.startDate, range.endDate),
    getBusinessEventsForAdmin(),
  ]);

  const activeLocations = locations.filter((location) => location.isActive);
  const defaultLocation =
    activeLocations.find((location) => location.isDefault) ??
    activeLocations[0] ??
    locations[0] ??
    null;

  const days = buildBusinessCalendarDays({
    month: navigation.monthValue,
    locations,
    exceptions,
    events,
  });

  return (
    <main className="page">
      <header className="page-header">
        <h1>Calendrier d&apos;ouverture</h1>
        <p>
          Sélectionne une ou plusieurs dates pour poser une fermeture, un congé ou créer un événement. Règle aussi la semaine normale d'ouverture depuis cette page.
        </p>

        <BusinessSectionNav section="site-admin" currentHref="/business/calendrier" />
      </header>

      <BusinessCalendarAdmin
        days={days}
        monthLabel={navigation.monthLabel}
        monthValue={navigation.monthValue}
        previousMonth={navigation.previousMonth}
        nextMonth={navigation.nextMonth}
        defaultLocationId={defaultLocation?.id ?? null}
        defaultLocationName={defaultLocation?.name ?? "lieu par défaut"}
        normalWeekHours={defaultLocation?.hours ?? []}
      />
    </main>
  );
}
