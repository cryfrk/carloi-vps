import { adminDashboardWidgets, adminPanels, getRoleDefinition } from '@carloi-v3/admin-core';
import type { AdminRoleKey } from '@carloi-v3/admin-core';
import { desktopRoutes, getVisibleDesktopNavigation } from './navigation.js';
import { commercialWorkflow, insuranceWorkflow, userEnforcementWorkflow } from './workflows.js';
import { adminDesktopWindows } from './window-layout.js';

export const adminDesktopBaseline = {
  runtime: 'electron',
  installable: true,
  loginFlow: ['username', 'password', '2fa-ready'],
  desktopRoutes,
  windows: adminDesktopWindows,
  workflows: {
    insurance: insuranceWorkflow,
    commercial: commercialWorkflow,
    users: userEnforcementWorkflow
  }
} as const;

export function buildAdminDesktopExperience(roles: readonly AdminRoleKey[]) {
  return {
    roleDefinitions: roles.map((role) => getRoleDefinition(role)).filter(Boolean),
    navigation: getVisibleDesktopNavigation(roles),
    panels: adminPanels.filter((panel) => panel.supportsDesktop && roles.some((role) => panel.allowedRoles.includes(role))),
    widgets: adminDashboardWidgets.filter((widget) => roles.some((role) => widget.allowedRoles.includes(role)))
  };
}
