-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "imageFileId" TEXT,
    "icon" TEXT,
    "parentId" TEXT,
    "layoutType" TEXT NOT NULL DEFAULT 'standard',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "banner" TEXT,
    "isDashboardMain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "categoryId" TEXT,
    "subCategoryId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "mrp" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT,
    "variants" JSONB NOT NULL DEFAULT '[]',
    "reviews" JSONB NOT NULL DEFAULT '[]',
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numReviews" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT false,
    "isBestSeller" BOOLEAN NOT NULL DEFAULT false,
    "giftWrapping" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "material" TEXT,
    "colors" JSONB NOT NULL DEFAULT '[]',
    "weight" DOUBLE PRECISION,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "barcode" TEXT,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "reorderLevel" INTEGER NOT NULL DEFAULT 0,
    "perPiecePrice" TEXT,
    "perPacketText" TEXT,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "email" TEXT,
    "googleId" TEXT,
    "avatar" TEXT NOT NULL DEFAULT '',
    "addresses" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "lastLogin" TIMESTAMP(3),
    "customerType" TEXT NOT NULL DEFAULT 'retail',
    "isSpecialCustomer" BOOLEAN NOT NULL DEFAULT false,
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gstNumber" TEXT,
    "businessName" TEXT,
    "whatsapp" TEXT,
    "visitingCard" TEXT,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "gstin" TEXT NOT NULL DEFAULT '',
    "shippingAddress" JSONB NOT NULL DEFAULT '{}',
    "paymentMethod" TEXT NOT NULL DEFAULT 'cod',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentId" TEXT,
    "rzOrderId" TEXT NOT NULL DEFAULT '',
    "orderStatus" TEXT NOT NULL DEFAULT 'placed',
    "statusHistory" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "couponCode" TEXT,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "giftWrapping" BOOLEAN NOT NULL DEFAULT false,
    "giftMessage" TEXT,
    "notes" TEXT,
    "trackingNumber" TEXT NOT NULL DEFAULT '',
    "courierName" TEXT NOT NULL DEFAULT '',
    "packingDetails" JSONB NOT NULL DEFAULT '[]',
    "wa" JSONB NOT NULL DEFAULT '{}',
    "estimatedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "image" TEXT,
    "link" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnMobile" BOOLEAN NOT NULL DEFAULT true,
    "showOnWebsite" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'hero',
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDiscount" DOUBLE PRECISION,
    "usageLimit" INTEGER NOT NULL DEFAULT 100,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validTill" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'Reteiler',
    "siteTagline" TEXT NOT NULL DEFAULT 'Gifts & Accessories',
    "siteLogo" TEXT NOT NULL DEFAULT '',
    "siteLogoFileId" TEXT NOT NULL DEFAULT '',
    "favicon" TEXT NOT NULL DEFAULT '',
    "whatsappNumber" TEXT NOT NULL DEFAULT '7550350036',
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@reteiler.in',
    "supportPhone" TEXT NOT NULL DEFAULT '',
    "homepageSections" JSONB NOT NULL DEFAULT '{}',
    "razorpay" JSONB NOT NULL DEFAULT '{}',
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "codAdvancePercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "codFlatCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "upiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "upiId" TEXT NOT NULL DEFAULT '',
    "shiprocket" JSONB NOT NULL DEFAULT '{}',
    "nimbuspost" JSONB NOT NULL DEFAULT '{}',
    "freeShippingAbove" DOUBLE PRECISION NOT NULL DEFAULT 499,
    "standardShippingCharge" DOUBLE PRECISION NOT NULL DEFAULT 49,
    "giftWrapCharge" DOUBLE PRECISION NOT NULL DEFAULT 29,
    "promoText" TEXT NOT NULL DEFAULT 'Free Delivery on orders above 499 | COD Available',
    "b2bEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moqPolicy" JSONB NOT NULL DEFAULT '{}',
    "subdomain" TEXT,
    "customDomain" TEXT,
    "adminSubdomain" TEXT,
    "adminCustomDomain" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'We are upgrading our store. Back soon!',
    "hapticFeedback" BOOLEAN NOT NULL DEFAULT true,
    "homeLayout" INTEGER NOT NULL DEFAULT 4,
    "websiteLayout" INTEGER NOT NULL DEFAULT 4,
    "mobileLayout" INTEGER NOT NULL DEFAULT 1,
    "metaPixelId" TEXT NOT NULL DEFAULT '',
    "metaPixelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "googleAnalyticsId" TEXT NOT NULL DEFAULT '',
    "googleAnalyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "deletePassword" TEXT NOT NULL DEFAULT '',
    "editPassword" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "page" TEXT NOT NULL,
    "referrer" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Unknown',
    "city" TEXT NOT NULL DEFAULT 'Unknown',
    "country" TEXT NOT NULL DEFAULT 'India',
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "browser" TEXT,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLog" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "oldStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "staffName" TEXT NOT NULL DEFAULT 'Staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffReport" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "fileId" TEXT,
    "staffName" TEXT NOT NULL DEFAULT 'Staff',
    "productCode" TEXT,
    "folderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffFeedback" (
    "id" TEXT NOT NULL,
    "folderId" TEXT,
    "reportId" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "sender" TEXT NOT NULL,
    "staffName" TEXT NOT NULL DEFAULT 'Staff',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "audioUrl" TEXT,
    "audioDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealOfDay" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "dealPrice" DOUBLE PRECISION NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealOfDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationState" (
    "id" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "MigrationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_isActive_isDeleted_createdAt_idx" ON "Product"("isActive", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "Otp_phone_otp_idx" ON "Otp"("phone", "otp");

-- CreateIndex
CREATE INDEX "Otp_expiresAt_idx" ON "Otp"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_orderStatus_createdAt_idx" ON "Order"("orderStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");

-- CreateIndex
CREATE INDEX "Order_rzOrderId_idx" ON "Order"("rzOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_userId_key" ON "Wishlist"("userId");

-- CreateIndex
CREATE INDEX "Banner_isActive_sortOrder_idx" ON "Banner"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_subdomain_key" ON "SiteSettings"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_customDomain_key" ON "SiteSettings"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_adminSubdomain_key" ON "SiteSettings"("adminSubdomain");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_adminCustomDomain_key" ON "SiteSettings"("adminCustomDomain");

-- CreateIndex
CREATE INDEX "Visitor_sessionId_idx" ON "Visitor"("sessionId");

-- CreateIndex
CREATE INDEX "Visitor_createdAt_idx" ON "Visitor"("createdAt");

-- CreateIndex
CREATE INDEX "Visitor_state_idx" ON "Visitor"("state");

-- CreateIndex
CREATE INDEX "Visitor_ip_createdAt_idx" ON "Visitor"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLog_productId_createdAt_idx" ON "InventoryLog"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffFolder_parentId_idx" ON "StaffFolder"("parentId");

-- CreateIndex
CREATE INDEX "StaffReport_folderId_createdAt_idx" ON "StaffReport"("folderId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffFeedback_folderId_createdAt_idx" ON "StaffFeedback"("folderId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffFeedback_reportId_idx" ON "StaffFeedback"("reportId");

-- CreateIndex
CREATE INDEX "DealOfDay_isActive_endTime_idx" ON "DealOfDay"("isActive", "endTime");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlist" ADD CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Banner" ADD CONSTRAINT "Banner_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLog" ADD CONSTRAINT "InventoryLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFolder" ADD CONSTRAINT "StaffFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StaffFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffReport" ADD CONSTRAINT "StaffReport_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "StaffFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFeedback" ADD CONSTRAINT "StaffFeedback_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "StaffFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffFeedback" ADD CONSTRAINT "StaffFeedback_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "StaffReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealOfDay" ADD CONSTRAINT "DealOfDay_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
