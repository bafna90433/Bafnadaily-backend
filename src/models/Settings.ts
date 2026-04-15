import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
  // Site Identity
  siteName: string;
  siteTagline: string;
  siteLogo: string;
  siteLogoFileId: string;
  favicon: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  supportEmail: string;
  supportPhone: string;

  // Homepage sections - admin can toggle
  homepageSections: {
    heroBanner: boolean;
    categories: boolean;
    featuresBar: boolean;
    trendingProducts: boolean;
    newArrivals: boolean;
    featuredProducts: boolean;
    promoBanners: boolean;
    underPriceBanner: boolean;
    giftComboBanner: boolean;
  };

  // Payment Settings
  razorpay: {
    enabled: boolean;
    keyId: string;
    keySecret: string;
    mode: 'test' | 'live';
  };
  codEnabled: boolean;
  codAdvancePercent: number; // e.g. 30 => 30% advance for COD
  codFlatCharge: number;     // flat COD charge e.g. ₹30
  upiEnabled: boolean;
  upiId: string;

  // Shipping Settings
  shiprocket: {
    enabled: boolean;
    email: string;
    password: string;
    channelId: string;
    token: string;
    tokenExpiry: Date | null;
  };
  freeShippingAbove: number;
  standardShippingCharge: number;
  giftWrapCharge: number;
  promoText: string;

  // B2B / Wholesale
  b2bEnabled: boolean;
  moqPolicy: {
    belowPrice: number;      // ₹60
    belowPriceQty: number;   // 3 pieces
    abovePriceQty: number;   // 2 pieces
  };

  // Domains
  subdomain: string;
  customDomain: string;
  adminSubdomain: string;
  adminCustomDomain: string;

  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
  hapticFeedback: boolean;
  homeLayout: number;
  websiteLayout: number;
  mobileLayout: number;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    siteName: { type: String, default: 'Reteiler' },
    siteTagline: { type: String, default: 'Gifts & Accessories' },
    siteLogo: { type: String, default: '' },
    siteLogoFileId: { type: String, default: '' },
    favicon: { type: String, default: '' },
    whatsappNumber: { type: String, default: '7550350036' },
    whatsappEnabled: { type: Boolean, default: true },
    supportEmail: { type: String, default: 'support@reteiler.in' },
    supportPhone: { type: String, default: '' },

    homepageSections: {
      heroBanner: { type: Boolean, default: true },
      categories: { type: Boolean, default: true },
      featuresBar: { type: Boolean, default: true },
      trendingProducts: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      featuredProducts: { type: Boolean, default: true },
      promoBanners: { type: Boolean, default: true },
      underPriceBanner: { type: Boolean, default: true },
      giftComboBanner: { type: Boolean, default: true },
    },

    razorpay: {
      enabled: { type: Boolean, default: false },
      keyId: { type: String, default: '' },
      keySecret: { type: String, default: '' },
      mode: { type: String, enum: ['test', 'live'], default: 'test' },
    },
    codEnabled: { type: Boolean, default: true },
    codAdvancePercent: { type: Number, default: 30 },
    codFlatCharge: { type: Number, default: 0 },
    upiEnabled: { type: Boolean, default: true },
    upiId: { type: String, default: '' },

    shiprocket: {
      enabled: { type: Boolean, default: false },
      email: { type: String, default: '' },
      password: { type: String, default: '' },
      channelId: { type: String, default: '' },
      token: { type: String, default: '' },
      tokenExpiry: { type: Date, default: null },
    },
    freeShippingAbove: { type: Number, default: 499 },
    standardShippingCharge: { type: Number, default: 49 },
    giftWrapCharge: { type: Number, default: 29 },
    promoText: { type: String, default: '🚚 Free Delivery on orders above ₹499 | COD Available 🎁' },

    b2bEnabled: { type: Boolean, default: true },
    moqPolicy: {
      belowPrice: { type: Number, default: 60 },
      belowPriceQty: { type: Number, default: 3 },
      abovePriceQty: { type: Number, default: 2 },
    },

    subdomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    customDomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    adminSubdomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    adminCustomDomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true },

    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We are upgrading our store. Back soon!' },
    hapticFeedback: { type: Boolean, default: true },
    homeLayout: { type: Number, default: 4, enum: [1, 2, 3, 4] },
    websiteLayout: { type: Number, default: 4, enum: [1, 2, 3, 4] },
    mobileLayout: { type: Number, default: 1, enum: [1, 2, 3] },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>('SiteSettings', siteSettingsSchema);
