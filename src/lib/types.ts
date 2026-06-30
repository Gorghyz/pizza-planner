export type OrderStatus = "new" | "in_progress" | "ready" | "completed";

export type CustomerRequestStatus = "new" | "contacted" | "resolved";
export type CustomerRequestSource = "desktop" | "mobile";
export type BusinessEventStatus = "draft" | "published" | "archived";

export type BusinessCalendarExceptionStatus = "open" | "closed" | "note";

export type BusinessCalendarException = {
  id: number;
  serviceDate: string;
  serviceDateLabel: string;
  status: BusinessCalendarExceptionStatus;
  title: string;
  note: string;
  locationId: number | null;
  locationName: string;
  address: string;
  city: string;
  opensAt: string | null;
  closesAt: string | null;
};

export type BusinessCalendarDay = {
  date: string;
  dateLabel: string;
  dayNumber: number;
  isoWeekday: number;
  weekdayLabel: string;
  isCurrentMonth: boolean;
  baseIsOpen: boolean;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  locationName: string;
  exception: BusinessCalendarException | null;
  events: BusinessEvent[];
};

export type BusinessCalendarExceptionWriteInput = {
  serviceDate: string;
  status: BusinessCalendarExceptionStatus;
  title: string;
  note: string;
  locationId: number | null;
  locationName: string;
  address: string;
  city: string;
  opensAt: string | null;
  closesAt: string | null;
};


export type PizzaPhoto = {
  id: number;
  pizzaId: number;
  imagePath: string;
  altText: string;
  displayOrder: number;
};

export type Pizza = {
  id: number;
  name: string;
  active: boolean;
  isClassic: boolean;
  displayOrder: number;
  prepMinutes: number;
  ingredients: string;
  description: string;
  allergens: string;
  photoPath: string | null;
  photos: PizzaPhoto[];
  priceCents: number;
  seasonality: string;
};

export type TodayOrder = {
  id: number;
  serviceDate: string;
  serviceDateLabel: string;
  eventTitle: string | null;
  customerName: string;
  desiredTime: string;
  promisedTime: string;
  totalMinutes: number;
  notes: string | null;
  status: OrderStatus;
  itemSummary: string;
};

export type OccupancyOrder = {
  id: number;
  promisedTime: string;
  totalMinutes: number;
};

export type DraftItem = {
  pizzaId: number;
  quantity: number;
  comment?: string;
};

export type QuoteResponse = {
  totalMinutes: number;
  slots: string[];
  serviceDate?: string;
  serviceDateLabel?: string;
  serviceOpeningTime?: string;
  serviceClosingTime?: string;
  weekdayLabel?: string;
  locationName?: string;
  eventTitle?: string;
};

export type CustomerRequestItem = {
  pizzaId: number;
  pizzaName: string;
  quantity: number;
  unitPriceCents: number;
};

export type CustomerRequest = {
  id: number;
  serviceDate: string;
  serviceDateLabel: string;
  eventId: number | null;
  eventTitle: string | null;
  customerName: string;
  customerPhone: string;
  desiredTime: string;
  selectedSlot: string;
  notes: string | null;
  itemSummary: string;
  totalPizzas: number;
  totalPriceCents: number;
  totalMinutes: number;
  source: CustomerRequestSource;
  status: CustomerRequestStatus;
  createdDate: string;
  createdAt: string;
};

export type BusinessLocation = {
  id: number;
  name: string;
  address: string;
  city: string;
  notes: string;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
};

export type OpeningHour = {
  id: number;
  locationId: number;
  isoWeekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

export type LocationWithHours = BusinessLocation & {
  hours: OpeningHour[];
};

export type TodayServiceSettings = {
  location: BusinessLocation | null;
  isoWeekday: number;
  weekdayLabel: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  openingRule: OpeningHour | null;
};

export type BusinessEventImage = {
  id: number;
  eventId: number;
  imagePath: string;
  altText: string;
  displayOrder: number;
};

export type BusinessEvent = {
  id: number;
  title: string;
  slug: string;
  status: BusinessEventStatus;
  serviceDate: string;
  serviceDateLabel: string;
  opensAt: string;
  closesAt: string;
  visibleFrom: string | null;
  orderOpensAt: string | null;
  orderClosesAt: string | null;
  locationId: number | null;
  locationName: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  publicNote: string;
  capacityPizzas: number | null;
  slotCapacityPizzas: number | null;
  images: BusinessEventImage[];
  pizzas: Pizza[];
  totalRequestedPizzas?: number;
  isVisibleNow?: boolean;
  isOrderingOpenNow?: boolean;
};

export type BusinessEventWriteInput = {
  id?: number;
  title: string;
  slug: string;
  status: BusinessEventStatus;
  serviceDate: string;
  opensAt: string;
  closesAt: string;
  visibleFrom: string | null;
  orderOpensAt: string | null;
  orderClosesAt: string | null;
  locationId: number | null;
  locationName: string;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  publicNote: string;
  capacityPizzas: number | null;
  slotCapacityPizzas: number | null;
  pizzaIds: number[];
  images: Omit<BusinessEventImage, "id" | "eventId">[];
};
