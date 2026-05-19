# AUTOCRAFT Frontend Components Architecture

This folder contains reusable frontend components used across the AUTOCRAFT ecommerce platform.

The goal of this architecture is to maintain a **modular, scalable, premium-grade React application** while keeping UI reusable, maintainable, and performance optimized.

---

# Folder Structure

```bash
components/
│── admin/
│── layout/
│── product/
│── shop/
│── ui/
└── readme.md
```

---

# Components Overview

## 1. `/admin`

Contains all admin dashboard and management-related components.

### Purpose
This folder powers the backend-facing ecommerce administration system.

### Current Components

| Component | Purpose |
|-----------|----------|
| `OrderActions.jsx` | Handles admin order actions (ship, cancel, update, etc.) |
| `OrderCard.jsx` | Displays order summary card |
| `OrderHeader.jsx` | Order page heading and controls |
| `OrderList.jsx` | Renders list of customer orders |
| `OrderReturn.jsx` | Return request management |
| `OrderTracking.jsx` | Shipment tracking system |
| `ProductForm.jsx` | Create/Edit product form |
| `ProductHeader.jsx` | Product management header |
| `ProductList.jsx` | Displays admin product list |
| `ProductTable.jsx` | Product table UI |

### Rules
- Keep business logic modular.
- Avoid duplicate admin UI.
- Prefer reusable admin widgets.
- Large admin features should be split into smaller components.

### Future Planned Features
- Real-time notifications
- Analytics dashboard
- Inventory monitoring
- Coupon management
- Low stock alerts
- Return approval workflow

---

## 2. `/layout`

Contains global layout components shared throughout the application.

### Purpose
Provides consistent structure and navigation across all pages.

### Current Components

| Component | Purpose |
|-----------|----------|
| `Navbar.jsx` | Main website navigation |
| `Footer.jsx` | Website footer |

### Rules
- Must stay reusable.
- Avoid page-specific logic.
- Maintain responsive behavior.
- Navigation performance is critical.

---

## 3. `/product`

Contains reusable product-related UI and business components.

### Purpose
Handles everything related to product display and interactions.

### Current Components

| Component | Purpose |
|-----------|----------|
| `ProductActions.jsx` | Product action buttons |
| `ProductGallery.jsx` | Product image gallery |
| `ProductInfo.jsx` | Product details section |
| `ProductPrice.jsx` | Pricing UI |
| `ProductReviews.jsx` | Customer reviews |
| `ProductSEO.jsx` | Product SEO metadata |
| `ProductStockStatus.jsx` | Stock availability display |
| `ProductVariants.jsx` | Product variant selection |
| `ReviewForm.jsx` | Customer review submission |

### Rules
- Components should be reusable across pages.
- Avoid tightly coupling product logic.
- Optimize rendering performance.
- Product pages must remain SEO-friendly.

### Future Planned Features
- Product comparison
- Smart recommendations
- Recently viewed products
- Advanced variant system
- Dynamic pricing support

---

## 4. `/shop`

Contains shopping experience and catalog-related components.

### Purpose
Manages product browsing, filtering, and shopping UX.

### Current Components

| Component | Purpose |
|-----------|----------|
| `ShopActiveFilters.jsx` | Active filter display |
| `ShopFilters.jsx` | Product filtering system |
| `ShopHeader.jsx` | Shop page header |
| `ShopMobileFilters.jsx` | Mobile filter UI |
| `ShopPagination.jsx` | Pagination system |
| `ShopProductGrid.jsx` | Product listing grid |

### Rules
- Maintain responsive-first UX.
- Filters must remain performant.
- Avoid unnecessary re-renders.
- Optimize for mobile shopping.

### Future Planned Features
- Smart filtering
- AI product suggestions
- Saved filters
- Advanced sorting system

---

## 5. `/ui`

Contains reusable global UI components.

### Purpose
This folder contains highly reusable UI building blocks used across the application.

### Current Components

| Component | Purpose |
|-----------|----------|
| `AdminRoute.jsx` | Admin route protection |
| `ProtectedRoute.jsx` | Authentication route protection |
| `CustomCursor.jsx` | Premium custom cursor system |
| `NotificationBell.jsx` | Notification trigger UI |
| `NotificationDropdown.jsx` | Notification panel |
| `Skeleton.jsx` | Loading skeleton component |
| `WhatsAppButton.jsx` | Floating WhatsApp support button |

### Rules
- Keep components highly reusable.
- Avoid business-specific logic.
- Maintain UI consistency.
- Follow premium design system.

### Future Planned Features
- Toast notification system
- Global modal system
- Reusable confirmation dialogs
- Animated loaders

---

# Architecture Principles

AUTOCRAFT follows a **component-driven architecture**.

### Core Principles

### 1. Reusability First
Avoid duplicate UI whenever possible.

Bad:
```jsx
<button>Buy Now</button>
```

Good:
```jsx
<ProductActions />
```

---

### 2. Separation of Concerns

Each folder should have a single responsibility.

| Folder | Responsibility |
|--------|----------------|
| `admin` | Dashboard & management |
| `layout` | Shared page layout |
| `product` | Product-related features |
| `shop` | Catalog & shopping |
| `ui` | Global reusable UI |

---

### 3. Performance First

Always prioritize:

- Lazy loading
- Memoization
- Component splitting
- Efficient rendering
- Mobile responsiveness

---

### 4. Scalable Architecture

Every feature should be designed assuming AUTOCRAFT will grow into a much larger ecommerce platform.

New features should be:
- Modular
- Reusable
- Maintainable
- Easy to debug

---

# Naming Convention

Use **PascalCase** for component names.

### Good

```bash
ProductGallery.jsx
NotificationBell.jsx
OrderTracking.jsx
```

### Avoid

```bash
productgallery.jsx
notification_bell.jsx
order-tracking.jsx
```

---

# Import Guidelines

Prefer clean imports.

Good:

```jsx
import ProductGallery from "../components/product/ProductGallery";
```

Avoid deeply nested messy imports whenever possible.

---

# Development Rules

Before creating a new component:

### Ask:

1. Can this be reused?
2. Does a similar component already exist?
3. Is this folder the correct place?
4. Can performance be improved?

---

# Project Vision

AUTOCRAFT is being developed as a **premium automotive ecommerce platform** with industrial-grade frontend architecture, scalable systems, premium UX, and production-level maintainability.

### Philosophy

> “Future me deserves clean code.”

And sometimes...

> “Some problems are solved in code. Others on two wheels on open roads.”

---

**Maintained by:** Saumyadeep Chakraborty  
**Project:** AUTOCRAFT