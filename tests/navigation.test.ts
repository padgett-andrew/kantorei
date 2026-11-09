import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Portal Navigation & Tablet Responsive Standards', () => {
  const rootDir = path.resolve(__dirname, '..');
  const portalNavPath = path.join(rootDir, 'src/components/portal/PortalNav.astro');
  const mobileBottomNavPath = path.join(rootDir, 'src/components/portal/MobileBottomNav.tsx');
  const userProfileMenuPath = path.join(rootDir, 'src/components/portal/UserProfileMenu.tsx');
  const portalLayoutPath = path.join(rootDir, 'src/layouts/PortalLayout.astro');
  const audioPlayerPath = path.join(rootDir, 'src/components/portal/music/AudioPlayer.tsx');

  const portalNavContent = fs.readFileSync(portalNavPath, 'utf-8');
  const mobileBottomNavContent = fs.readFileSync(mobileBottomNavPath, 'utf-8');
  const userProfileMenuContent = fs.readFileSync(userProfileMenuPath, 'utf-8');
  const portalLayoutContent = fs.readFileSync(portalLayoutPath, 'utf-8');
  const audioPlayerContent = fs.readFileSync(audioPlayerPath, 'utf-8');

  it('ensures top desktop navigation in PortalNav only activates at xl (>= 1280px)', () => {
    // Should NOT use lg:flex which caused clipping on tablets in landscape (1024px)
    expect(portalNavContent).not.toMatch(/hidden items-center gap-5 overflow-x-auto py-2 lg:flex/);
    expect(portalNavContent).toMatch(/hidden items-center gap-5 overflow-x-auto py-2 xl:flex/);
  });

  it('ensures MobileBottomNav is active on mobile and tablets (xl:hidden) with no sm:hidden dead zone', () => {
    // The bottom nav must not be hidden at sm (640px)
    expect(mobileBottomNavContent).not.toMatch(/aria-label="Mobile Navigation"[\s\S]*?sm:hidden/);
    // It should be visible until desktop xl (1280px)
    expect(mobileBottomNavContent).toMatch(/aria-label="Portal Navigation"[\s\S]*?xl:hidden/);
    // Drawer container must also be visible until xl
    expect(mobileBottomNavContent).toMatch(/className="fixed inset-0 z-50 xl:hidden"/);
  });

  it('centers bottom navigation and drawer sheet on tablet viewports', () => {
    // Bottom nav items must be centered with max-w-xl so they do not stretch excessively on tablets
    expect(mobileBottomNavContent).toMatch(/mx-auto flex max-w-xl items-center justify-around sm:px-4/);
    // Sheet container on tablets should float with rounded corners and centered layout
    expect(mobileBottomNavContent).toMatch(/sm:inset-x-4 sm:bottom-6 sm:mx-auto sm:max-w-xl sm:rounded-2xl/);
  });

  it('includes all 7 portal workspaces in the mobile & tablet drawer', () => {
    const requiredWorkspaces = [
      '/portal',
      '/portal/music',
      '/portal/absences',
      '/portal/snacks',
      '/portal/seating',
      '/portal/directory',
      '/portal/handbook',
    ];

    for (const workspace of requiredWorkspaces) {
      expect(mobileBottomNavContent).toContain(`href="${workspace}"`);
    }
  });

  it('configures UserProfileMenu to trigger the mobile drawer on mobile and tablet (< 1280px)', () => {
    // Must NOT be hardcoded to 640px (sm) which prevented tablet users from opening the drawer
    expect(userProfileMenuContent).not.toMatch(/window\.innerWidth < 640/);
    expect(userProfileMenuContent).toMatch(/max-width: 1279px/);
    expect(userProfileMenuContent).toContain('kantorei:open-mobile-drawer');
  });

  it('ensures PortalLayout reserves clearance for the bottom nav bar on mobile and tablets', () => {
    // Main padding should clear the bottom bar on < xl and only shrink on xl:
    expect(portalLayoutContent).toMatch(/pb-28 xl:pb-16/);
    // Footer padding should clear the bottom bar on < xl and only shrink on xl:
    expect(portalLayoutContent).toMatch(/pb-\[calc\(5\.75rem\+env\(safe-area-inset-bottom,0px\)\)\] xl:pb-8/);
  });

  it('docks AudioPlayer above the bottom nav bar on mobile and tablets', () => {
    // AudioPlayer must float above the bottom nav on < xl and dock to bottom-0 on xl
    expect(audioPlayerContent).not.toMatch(/sm:bottom-0/);
    expect(audioPlayerContent).toMatch(/bottom-\[calc\(3\.75rem\+env\(safe-area-inset-bottom,0px\)\)\] xl:bottom-0/);
  });

  it('supports swipe-to-dismiss and overscroll containment on the mobile drawer', () => {
    // Must contain overscroll to prevent browser pull-to-refresh interference
    expect(mobileBottomNavContent).toContain('overscroll-y-contain');
    // Must have a draggable grab handle with pointer event handlers and touch-none
    expect(mobileBottomNavContent).toMatch(/onPointerDown=\{.*?handlePointerDown/);
    expect(mobileBottomNavContent).toMatch(/cursor-grab touch-none/);
    // Must dynamically transform translateY during swipe drag and dismiss animation
    expect(mobileBottomNavContent).toContain('sheetTransform');
  });
});
