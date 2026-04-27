# Carloi V3

Carloi V3 is a clean monorepo baseline that keeps the live backend contract intact while resetting the product surface.

- Backend/API remains the source of truth: `https://api.carloi.com`
- Old V1/V2 UI code is not imported into V3
- V3 packages are framework-agnostic where possible
- V3 apps can evolve independently from legacy folders

## Workspace layout

- `apps/mobile`
- `apps/web`
- `apps/admin-desktop`
- `apps/admin-mobile`
- `packages/shared`
- `packages/api-client`
- `packages/vehicle-catalog`
- `packages/legal`
- `packages/ui`
- `docs/*`

## Root commands

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm run test`
