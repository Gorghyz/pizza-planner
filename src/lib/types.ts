export type OrderStatus = "new" | "in_progress" | "ready" | "completed";

export type CustomerRequestStatus = "new" | "contacted" | "resolved";
export type CustomerRequestSource = "desktop" | "mobile";

export type Pizza = {
  id: number;
  name: string;
  active: boolean;
  displayOrder: number;
  prepMinutes: number;
  ingredients: string;
  description: string;
  allergens: string;
  photoPath: string | null;
  priceCents: number;
  seasonality: string;
};

export type TodayOrder = {
  id: number;
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
  serviceOpeningTime?: string;
  serviceClosingTime?: string;
  weekdayLabel?: string;
  locationName?: string;
};

export type CustomerRequestItem = {
  pizzaId: number;
  pizzaName: string;
  quantity: number;
  unitPriceCents: number;
};

export type CustomerRequest = {
  id: number;
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
  createdAt: string;
};

export type BusinessLocation = {
  id: number;
  name: string;
  address: string;
  city: string;
  notes: string;
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