import { adminDesktopNavigation, adminPanels, roleCanAccessPanel } from '@carloi-v3/admin-core';
import type { AdminPanelDefinition, AdminRoleKey } from '@carloi-v3/admin-core';

export interface DesktopRouteDefinition {
  route: string;
  title: string;
  panelKey: AdminPanelDefinition['key'];
  requiresReasonPromptForActions: string[];
}

export const desktopRoutes: readonly DesktopRouteDefinition[] = adminPanels
  .filter((panel) => panel.supportsDesktop)
  .map((panel) => ({
    route: panel.desktopRoute,
    title: panel.title,
    panelKey: panel.key,
    requiresReasonPromptForActions: [...panel.criticalActions]
  }));

export function getVisibleDesktopNavigation(roles: readonly AdminRoleKey[]) {
  return adminDesktopNavigation.filter((item) => {
    const panel = adminPanels.find((entry) => entry.key === item.panelKey);
    return panel ? roles.some((role) => roleCanAccessPanel(role, panel)) : false;
  });
}
