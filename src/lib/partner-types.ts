export type PartnerCategory = "producteur" | "distributeur" | "partenaire";

export type Partner = {
  id: number;
  name: string;
  category: PartnerCategory;
  description: string;
  photoPath: string | null;
  contactEnabled: boolean;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PartnerWriteInput = {
  name: string;
  category: PartnerCategory;
  description: string;
  photoPath: string | null;
  contactEnabled: boolean;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  isActive: boolean;
};