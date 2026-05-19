# AUTOCRAFT Components Architecture

This folder contains reusable components used across the AUTOCRAFT frontend.

## Folder Structure

### /admin
Admin-specific components.

Purpose:
- Dashboard widgets
- Analytics UI
- Order management
- Product management
- User management
- Inventory controls
- Notifications system

Rules:
- Keep admin logic modular
- Avoid duplicate UI patterns

---

### /layout
Global layout components shared across pages.

Examples:
- Navbar
- Footer
- Sidebar
- Breadcrumbs
- Layout wrappers

Rules:
- Must remain reusable
- Should not contain page-specific logic

---

### /product
Product-related reusable components.

Examples:
- ProductCard
- ProductGrid
- ProductGallery
- ProductReviews
- ProductVariantSelector
- WishlistButton

Rules:
- Product UI should be reusable everywhere
- Optimize rendering performance

---

### /shop
Shopping flow components.

Examples:
- Filters
- Sorting
- Cart UI
- Checkout components
- Coupon UI
- Shipping UI

Rules:
- Keep business logic separated
- Preserve responsive UX

---

### /ui
Atomic reusable UI components.

Examples:
- Buttons
- Inputs
- Modals
- Loaders
- Toasts
- Skeletons
- Dialogs

Rules:
- Highly reusable
- Keep styling consistent
- Avoid business-specific logic

---

## Development Rules

1. Do NOT break existing functionality.
2. Reuse components whenever possible.
3. Keep code modular and scalable.
4. Follow responsive-first design.
5. Optimize performance and lazy loading where necessary.
6. Maintain consistent naming conventions.

## Naming Convention

Use PascalCase for component files.

Good:
- ProductCard.jsx
- CheckoutModal.jsx
- OrderTracker.jsx

Avoid:
- productcard.jsx
- checkout-modal.jsx
- order_tracker.jsx

## Project Goal

AUTOCRAFT aims to maintain an industrial-grade premium ecommerce architecture with scalable, secure, and reusable components.