# Merchant workflow changes — 2026-10-17

## Implemented

- Catalog: three primary entry cards for Excel/CSV, shelf photography, and manual product entry.
- Dashboard: removed recent extraction table; KPI details and stock replenishment list expand on click. Existing sales and category charts remain; Chart.js 4.4.8 is pinned locally so the charts no longer depend on a CDN at runtime.
- Staff: actual server roles only; object/string permission responses, all eight documented permissions, editable custom roles, accurate staff statuses, escaped server text, explicit loading failures/retry, and duplicate-submit protection. Unknown permissions are retained when editing a role.
- Excel: explicit field headers take priority over content guesses. Product names such as `حليب` and `ماء` no longer become categories and displace name/price mapping. Explicit SKU headers retain valid text identifiers. Real XLSX fixtures cover identifiers, zero prices, quantities, zones, and server rejection.
- Password recovery: check the nested `ForgotPasswordResponseDto.success` before continuing; show server failure, prevent duplicate submission, validate email/token during reset. This verifies frontend behavior, not email delivery.
- Map: integrated the requested repository at revision `81d8fe3e238bed0820540bbdcee1cb83d1feda6b`; starts in merchant editor, loads every page of the active store catalog, removes demo product assumptions, and scopes layout/preview/report storage by store. Restoring a layout refreshes the catalog and removes locations for deleted products.
- Sidebar: closes correctly when moving from a desktop viewport to a mobile viewport.

## Backend dependencies / limits

### Zone-scoped staff

The frontend now includes Store/Zones scope selection during employee creation, multi-zone selection, an existing employee role/scope editor, and scope display in the employee table. It preserves server scope in both store-selection flows. See [STAFF_ZONE_API_CONTRACT.md](STAFF_ZONE_API_CONTRACT.md) for the exact new and extended endpoints.

The deployed backend still needs the new contract. The UI requires explicit capability confirmation from `GET /stores/{storeId}/staff/scope-options` before sending scoped requests and verifies echoed scope after writes. Unsupported servers cannot silently create a store-wide employee when Zones was selected. Legacy whole-store creation remains compatible. Scope enforcement must be implemented on the server; no client-only filtering is presented as authorization.

### Map publishing

The supplied map project saves locally. Integrated maps and shelf placements remain local to this browser, isolated per store. They are not published to customer clients or synchronized across devices. The FastAPI map draft/batch/publish endpoints exist, but the deployed `StoreMapResponse`/node contract does not represent the full editor document (rotation, shelf faces, levels, slots, and product placements). A complete adapter and server persistence contract are needed before advertising cloud saving.

### Real service verification

Automated browser tests intercept API responses. They verify actual XLSX parsing, request payloads, success/error handling, and page behavior without creating production inventory or employees. Production writes/import and actual SMTP delivery remain unverified without an authenticated test store and a reachable test inbox. No password reset email was sent during this work.

## Validation

- `npm run build:css`
- `npm run check`
- `npm test`
- `npm run test:e2e`

The e2e suite includes dashboard disclosure, successful/rejected XLSX import, employee creation/rejected role edit, nested password email failure/success, map catalog pagination and store isolation, plus the pre-existing workflows. Screenshots are written to ignored `test-results/` during testing.

## Navigation consolidation

The standalone aisle/shelf editor was retired: it stored a separate, browser-only aisle list and manual item counts without synchronizing map geometry or product placements. Its navigation entry and controller were removed. `shelves.html` now redirects old bookmarks to `store-map.html`; existing local aisle data is left intact. Merchant navigation now shows permanent icon labels on desktop and the same labeled links in the mobile drawer, with active-page indication and grouped destinations.
