import { z } from "zod";

// Donations to Israeli NGOs from foreign state entities, as the NGOs reported
// them to the Registrar of Associations (published on data.gov.il, dataset
// moj-amutot). Written only by scripts/funding-ingest.ts, never by hand.

export const Donation = z
  .object({
    reportDate: z.iso.date().nullable(),
    donor: z.string(),
    donorType: z.string(),
    donorCountry: z.string().nullable(), // inferred from the donor's name; null when unclear
    amountNis: z.number(),
    currency: z.string(),
    rate: z.number().nullable(),
    purpose: z.string(),
    conditions: z.string(),
    year: z.number().int(),
    quarter: z.number().int().min(1).max(4).nullable(),
    mainlyForeignFunded: z.boolean(), // the NGO's own declaration in this report
  })
  .strict();
export type Donation = z.infer<typeof Donation>;

export const Ngo = z
  .object({
    number: z.string(),
    name: z.string(),
    nameEn: z.string(),
    status: z.string(),
    sector: z.string(),
    city: z.string(),
    goals: z.string(),
    turnover: z.number().nullable(),
    turnoverYear: z.number().int().nullable(),
    donations: z.array(Donation),
  })
  .strict();
export type Ngo = z.infer<typeof Ngo>;

export const FundingState = z
  .object({ updatedAt: z.iso.datetime(), reports: z.number().int(), ngos: z.number().int(), sourceModified: z.string().nullable() })
  .strict();
