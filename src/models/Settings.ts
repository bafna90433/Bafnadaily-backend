import { createCompatModel } from '../db/compat';

export type ISiteSettings = any;

export const SiteSettings: any = createCompatModel({
  name: 'SiteSettings', delegate: 'siteSettings',
  fields: ['id', 'siteName', 'siteTagline', 'siteLogo', 'siteLogoFileId', 'favicon', 'whatsappNumber', 'whatsappEnabled', 'supportEmail', 'supportPhone', 'homepageSections', 'razorpay', 'codEnabled', 'codAdvancePercent', 'codFlatCharge', 'upiEnabled', 'upiId', 'shiprocket', 'nimbuspost', 'freeShippingAbove', 'standardShippingCharge', 'giftWrapCharge', 'promoText', 'b2bEnabled', 'moqPolicy', 'subdomain', 'customDomain', 'adminSubdomain', 'adminCustomDomain', 'maintenanceMode', 'maintenanceMessage', 'hapticFeedback', 'homeLayout', 'websiteLayout', 'mobileLayout', 'metaPixelId', 'metaPixelEnabled', 'googleAnalyticsId', 'googleAnalyticsEnabled', 'deletePassword', 'editPassword', 'createdAt', 'updatedAt'],
  jsonFields: ['homepageSections', 'razorpay', 'shiprocket', 'nimbuspost', 'moqPolicy'],
  defaults: {
    siteName: 'Reteiler', siteTagline: 'Gifts & Accessories', siteLogo: '', siteLogoFileId: '', favicon: '', whatsappNumber: '7550350036', whatsappEnabled: true, supportEmail: 'support@reteiler.in', supportPhone: '',
    homepageSections: { heroBanner: true, categories: true, featuresBar: true, trendingProducts: true, newArrivals: true, featuredProducts: true, promoBanners: true, underPriceBanner: true, giftComboBanner: true },
    razorpay: { enabled: false, keyId: '', keySecret: '', mode: 'test' }, codEnabled: true, codAdvancePercent: 30, codFlatCharge: 0, upiEnabled: true, upiId: '',
    shiprocket: { enabled: false, email: '', password: '', channelId: '', token: '', tokenExpiry: null },
    nimbuspost: { enabled: false, email: '', password: '', pickupWarehouseName: 'Primary', pickupContactName: '', pickupAddress: '', pickupCity: '', pickupState: '', pickupPincode: '', pickupPhone: '', token: '', tokenExpiry: null },
    freeShippingAbove: 499, standardShippingCharge: 49, giftWrapCharge: 29, promoText: '🚚 Free Delivery on orders above ₹499 | COD Available 🎁',
    b2bEnabled: true, moqPolicy: { belowPrice: 60, belowPriceQty: 3, abovePriceQty: 2 }, subdomain: null, customDomain: null, adminSubdomain: null, adminCustomDomain: null,
    maintenanceMode: false, maintenanceMessage: 'We are upgrading our store. Back soon!', hapticFeedback: true, homeLayout: 4, websiteLayout: 4, mobileLayout: 1,
    metaPixelId: '', metaPixelEnabled: false, googleAnalyticsId: '', googleAnalyticsEnabled: false, deletePassword: '', editPassword: '',
  },
  beforeSave: doc => {
    for (const key of ['subdomain', 'customDomain', 'adminSubdomain', 'adminCustomDomain']) doc[key] = doc[key] ? String(doc[key]).trim().toLowerCase() : null;
  },
});
