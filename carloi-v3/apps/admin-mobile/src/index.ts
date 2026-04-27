import { adminDashboardWidgets, adminPanels, getRoleDefinition } from '@carloi-v3/admin-core';
import type { AdminRoleKey } from '@carloi-v3/admin-core';
import { adminMobileScreenContracts } from './screens.js';
import { adminMobileTabs, getVisibleMobileTabs, mobileCriticalScreens } from './navigation.js';

export const adminMobileBaseline = {
  runtime: 'expo-react-native',
  distribution: 'android-apk',
  loginFlow: ['username', 'password', '2fa-ready'],
  tabs: adminMobileTabs,
  criticalScreens: mobileCriticalScreens,
  screenContracts: adminMobileScreenContracts
} as const;

export function buildAdminMobileExperience(roles: readonly AdminRoleKey[]) {
  return {
    roleDefinitions: roles.map((role) => getRoleDefinition(role)).filter(Boolean),
    tabs: getVisibleMobileTabs(roles),
    panels: adminPanels.filter((panel) => panel.supportsMobile && roles.some((role) => panel.allowedRoles.includes(role))),
    widgets: adminDashboardWidgets.filter((widget) => roles.some((role) => widget.allowedRoles.includes(role)))
  };
}
