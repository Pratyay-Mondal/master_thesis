/**
 * drawer_top_layer.test.js
 * Unit test suite for Top-Layer Popover coordinate clamping,
 * viewport boundary resilience, and Shadow DOM composedPath() event isolation.
 *
 * Thesis: "AI Transparency in the Wild: Bridging Technical Provenance
 * and Legal Compliance under the EU AI Act on Social Media Platforms"
 */

import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.AITransparency = globalThis.AITransparency || {};
await import('../../src/ui/drawer_component.js');
await import('../../src/ui/badge_component.js');
await import('../../src/content/ui_injector.js');

const { DrawerComponent, UIInjector } = globalThis.AITransparency;

test('Top Layer Audit Drawer: Viewport Coordinate Clamping', async (t) => {
  const viewport = { width: 1280, height: 800 };
  const drawerDims = { width: 348, height: 380 };

  await t.test('places drawer cleanly below trigger in normal viewport conditions', () => {
    const triggerRect = { top: 120, bottom: 148, left: 100, right: 260 };
    const pos = DrawerComponent.computePosition(triggerRect, drawerDims, viewport);

    assert.equal(pos.top, 154); // bottom (148) + 6px gap
    assert.equal(pos.left, 100);
    assert.equal(pos.isOffscreen, false);
  });

  await t.test('flips drawer above trigger when bottom overflow occurs and room exists above', () => {
    // Trigger is near bottom: top: 680, bottom: 708
    // Below would be 708 + 6 + 380 = 1094 > 792 (overflows viewport height 800)
    // Above fits: 680 - 380 - 6 = 294 >= 8
    const triggerRect = { top: 680, bottom: 708, left: 150, right: 310 };
    const pos = DrawerComponent.computePosition(triggerRect, drawerDims, viewport);

    assert.equal(pos.top, 294); // flips above: 680 - 380 - 6
    assert.equal(pos.left, 150);
    assert.equal(pos.isOffscreen, false);
  });

  await t.test('clamps drawer to viewport right edge when trigger is near right margin', () => {
    // Trigger is near right boundary: left: 1100, right: 1260
    // left + 348 = 1448 > 1280 - 8 (1272)
    // Clamped left = 1280 - 348 - 8 = 924
    const triggerRect = { top: 200, bottom: 228, left: 1100, right: 1260 };
    const pos = DrawerComponent.computePosition(triggerRect, drawerDims, viewport);

    assert.equal(pos.left, 924);
    assert.ok(pos.left + drawerDims.width <= viewport.width);
  });

  await t.test('clamps drawer to viewport left edge when trigger is near left margin', () => {
    const triggerRect = { top: 200, bottom: 228, left: 2, right: 120 };
    const pos = DrawerComponent.computePosition(triggerRect, drawerDims, viewport);

    assert.equal(pos.left, 8); // clamped to margin 8px
  });

  await t.test('flags isOffscreen=true when trigger has scrolled out of view', () => {
    // Scrolled past top
    const scrolledUp = { top: -60, bottom: -20, left: 100, right: 260 };
    assert.equal(DrawerComponent.computePosition(scrolledUp, drawerDims, viewport).isOffscreen, true);

    // Scrolled past bottom
    const scrolledDown = { top: 850, bottom: 890, left: 100, right: 260 };
    assert.equal(DrawerComponent.computePosition(scrolledDown, drawerDims, viewport).isOffscreen, true);
  });

  await t.test('UIInjector.computePosition produces identical clamping behavior', () => {
    const triggerRect = { top: 650, bottom: 678, left: 1050, right: 1200 };
    const drawerPos = DrawerComponent.computePosition(triggerRect, drawerDims, viewport);
    const injectorPos = UIInjector.computePosition(triggerRect, drawerDims, viewport);

    assert.deepEqual(drawerPos, injectorPos);
  });

  await t.test('computePosition defaults to 440px width and 420px height for enlarged audit drawer', () => {
    // When trigger is at left=1000 in a 1280px wide viewport with default dimensions (width: 440):
    // 1000 + 440 = 1440 > 1280 - 8 (1272)
    // Left clamps to: 1280 - 440 - 8 = 832
    const triggerRect = { top: 100, bottom: 128, left: 1000, right: 1150 };
    const pos = DrawerComponent.computePosition(triggerRect, undefined, viewport);

    assert.equal(pos.top, 134); // 128 + 6
    assert.equal(pos.left, 832); // clamped based on 440px width!
  });
});

test('Event Isolation: Shadow DOM composedPath() & Click Dismissal', async (t) => {
  await t.test('isEventInside returns true when click originates inside target or its Shadow DOM descendants', () => {
    const mockInternalNode = { id: 'inner-close-btn' };
    const mockPanel = { id: 'drawer-panel' };
    const mockDrawer = { id: 'ai-audit-drawer-host' };

    // When an event originates inside Shadow DOM, composedPath() lists the internal elements up to the host
    const insideEvent = {
      target: mockDrawer, // In standard browser events retargeted to host
      composedPath: () => [mockInternalNode, mockPanel, mockDrawer, { id: 'body' }, { id: 'html' }]
    };

    assert.equal(DrawerComponent.isEventInside(insideEvent, mockDrawer), true);
    assert.equal(UIInjector.isEventInside(insideEvent, mockDrawer), true);
  });

  await t.test('isEventInside returns false for outside clicks, allowing clean dismissal', () => {
    const mockDrawer = { id: 'ai-audit-drawer-host' };
    const mockOutsidePost = { id: 'facebook-post-body' };

    const outsideEvent = {
      target: mockOutsidePost,
      composedPath: () => [mockOutsidePost, { id: 'feed-container' }, { id: 'body' }, { id: 'html' }]
    };

    assert.equal(DrawerComponent.isEventInside(outsideEvent, mockDrawer), false);
    assert.equal(UIInjector.isEventInside(outsideEvent, mockDrawer), false);
  });

  await t.test('falls back gracefully to contains() if composedPath is missing', () => {
    const childNode = { id: 'child' };
    const parentNode = {
      id: 'parent',
      contains: (node) => node === childNode
    };

    const eventWithoutComposedPath = {
      target: childNode
    };

    assert.equal(DrawerComponent.isEventInside(eventWithoutComposedPath, parentNode), true);

    const outsideNode = { id: 'outside' };
    assert.equal(DrawerComponent.isEventInside({ target: outsideNode }, parentNode), false);
  });
});

