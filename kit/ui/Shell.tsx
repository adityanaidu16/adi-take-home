"use client";

import {
  Avatar,
  Button,
  Caption1,
  Divider,
  makeStyles,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SearchBox,
  shorthands,
  Text,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowExportRegular,
  CheckmarkCircleRegular,
  GridDotsRegular,
  HistoryRegular,
  DocumentBulletListRegular,
  HomeRegular,
  NavigationRegular,
  SettingsRegular,
  TableRegular,
} from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavApp = { slug: string; name: string; visible: boolean };

export type ShellUser = { name: string; username: string; groups: string[] } | null;

const BRAND = "#742774";

const useStyles = makeStyles({
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  header: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("8px"),
    backgroundColor: BRAND,
    color: "#fff",
    height: "48px",
    ...shorthands.padding("0", "12px"),
    flexShrink: 0,
  },
  headerButton: {
    color: "#fff",
    minWidth: "32px",
    ":hover": { color: "#fff", backgroundColor: "rgba(255,255,255,0.12)" },
    ":hover:active": { color: "#fff", backgroundColor: "rgba(255,255,255,0.2)" },
  },
  product: {
    color: "#fff",
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: "nowrap",
  },
  appName: {
    color: "rgba(255,255,255,0.85)",
    whiteSpace: "nowrap",
  },
  search: { maxWidth: "420px", width: "100%" },
  spacer: { flexGrow: 1 },
  body: { display: "flex", flexGrow: 1, minHeight: 0 },
  nav: {
    width: "240px",
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRight("1px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.padding("8px", "8px"),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("2px"),
    overflowY: "auto",
  },
  navCollapsed: { width: "48px" },
  navGroup: {
    ...shorthands.padding("12px", "12px", "4px"),
    color: tokens.colorNeutralForeground3,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("10px"),
    ...shorthands.padding("0", "10px"),
    height: "36px",
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    color: tokens.colorNeutralForeground1,
    textDecorationLine: "none",
    fontSize: tokens.fontSizeBase300,
    position: "relative",
    ":hover": { backgroundColor: tokens.colorNeutralBackground3Hover },
  },
  navItemActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    fontWeight: tokens.fontWeightSemibold,
    "::before": {
      content: '""',
      position: "absolute",
      left: "0px",
      top: "6px",
      bottom: "6px",
      width: "3px",
      ...shorthands.borderRadius("2px"),
      backgroundColor: BRAND,
    },
  },
  navItemDisabled: {
    color: tokens.colorNeutralForegroundDisabled,
    cursor: "not-allowed",
    ":hover": { backgroundColor: "transparent" },
  },
  navLabel: { overflowX: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  content: { flexGrow: 1, minWidth: 0, overflowY: "auto" },
  contentInner: { ...shorthands.padding("16px", "24px", "32px") },
  identity: { display: "flex", alignItems: "center", ...shorthands.gap("8px") },
});

function NavItem({
  href,
  icon,
  label,
  active,
  disabled,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  collapsed: boolean;
}) {
  const styles = useStyles();
  const className = [
    styles.navItem,
    active ? styles.navItemActive : "",
    disabled ? styles.navItemDisabled : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {icon}
      {!collapsed && <span className={styles.navLabel}>{label}</span>}
    </>
  );

  const item = disabled ? (
    <span className={className} aria-disabled title="No access">
      {content}
    </span>
  ) : (
    <a className={className} href={href} aria-current={active ? "page" : undefined}>
      {content}
    </a>
  );

  return collapsed ? (
    <Tooltip content={label} relationship="label">
      {item}
    </Tooltip>
  ) : (
    item
  );
}

/**
 * The chrome every app shares: a branded suite bar, a site-map rail listing the
 * apps this user can open, and the page area. Matches the shape of a
 * model-driven Power App so people moving over do not have to relearn it.
 */
export function Shell({
  apps,
  user,
  children,
}: {
  apps: NavApp[];
  user: ShellUser;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const pathname = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const initials = user?.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button
          appearance="transparent"
          className={styles.headerButton}
          icon={<NavigationRegular />}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => setCollapsed((value) => !value)}
        />
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button
              appearance="transparent"
              className={styles.headerButton}
              icon={<GridDotsRegular />}
              aria-label="App launcher"
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {apps.map((app) => (
                <MenuItem
                  key={app.slug}
                  icon={<TableRegular />}
                  disabled={!app.visible}
                  onClick={() => window.location.assign(`/apps/${app.slug}`)}
                >
                  {app.name}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                icon={<DocumentBulletListRegular />}
                onClick={() => window.location.assign("/my-requests")}
              >
                My requests
              </MenuItem>
              <MenuItem
                icon={<CheckmarkCircleRegular />}
                onClick={() => window.location.assign("/approvals")}
              >
                Approvals
              </MenuItem>
              <MenuItem
                icon={<HistoryRegular />}
                onClick={() => window.location.assign("/audit")}
              >
                Audit log
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Text className={styles.product}>Internal Tools</Text>
        <Divider vertical style={{ height: 20, opacity: 0.4 }} />
        <Text className={styles.appName} size={300}>
          Operations
        </Text>
        <div className={styles.spacer} />
        <Tooltip content="Search is not part of this prototype" relationship="description">
          <SearchBox
            className={styles.search}
            placeholder="Search (not in this prototype)"
            appearance="filled-lighter"
            disabled
          />
        </Tooltip>
        <div className={styles.spacer} />
        <Tooltip content="Settings are not part of this prototype" relationship="label">
          <Button
            appearance="transparent"
            className={styles.headerButton}
            icon={<SettingsRegular />}
            aria-label="Settings"
            disabled
          />
        </Tooltip>
        {user ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button
                aria-label={`Account manager for ${user.name}`}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <Avatar name={user.name} initials={initials} color="colorful" size={32} />
              </button>
            </MenuTrigger>
            <MenuPopover>
              <div style={{ padding: "8px 12px" }}>
                <Text weight="semibold">{user.name}</Text>
                <div>
                  <Caption1>{user.groups.join(", ") || "no groups"}</Caption1>
                </div>
              </div>
              <Divider />
              <MenuList>
                <MenuItem onClick={() => window.location.assign("/api/auth/logout")}>
                  Sign out
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : (
          <Button as="a" href="/api/auth/login" appearance="transparent" className={styles.headerButton}>
            Sign in
          </Button>
        )}
      </header>

      <div className={styles.body}>
        <nav className={`${styles.nav} ${collapsed ? styles.navCollapsed : ""}`} aria-label="Site map">
          <NavItem
            href="/"
            icon={<HomeRegular />}
            label="Home"
            active={pathname === "/"}
            collapsed={collapsed}
          />
          {!collapsed && <Caption1 className={styles.navGroup}>Apps</Caption1>}
          {apps.map((app) => (
            <NavItem
              key={app.slug}
              href={`/apps/${app.slug}`}
              icon={<TableRegular />}
              label={app.name}
              active={pathname === `/apps/${app.slug}`}
              disabled={!app.visible}
              collapsed={collapsed}
            />
          ))}
          {!collapsed && <Caption1 className={styles.navGroup}>Governance</Caption1>}
          <NavItem
            href="/my-requests"
            icon={<DocumentBulletListRegular />}
            label="My requests"
            active={pathname === "/my-requests"}
            collapsed={collapsed}
          />
          <NavItem
            href="/approvals"
            icon={<CheckmarkCircleRegular />}
            label="Approvals"
            active={pathname === "/approvals"}
            collapsed={collapsed}
          />
          <NavItem
            href="/audit"
            icon={<HistoryRegular />}
            label="Audit log"
            active={pathname === "/audit"}
            collapsed={collapsed}
          />
          <NavItem
            href="https://github.com/adityanaidu16/adi-take-home"
            icon={<ArrowExportRegular />}
            label="Source"
            active={false}
            collapsed={collapsed}
          />
        </nav>

        <main className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}
