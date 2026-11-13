/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

add_task(async function test_relocate_existing_components_without_restyling() {
  await gZenStartup.promiseInitialized;
  const root = document.documentElement;
  const manager = gZenVerticalTabsManager;
  const workspaceId = gZenWorkspaces.activeWorkspace;
  let createdWorkspace;
  const tab = gBrowser.addTrustedTab('about:blank', { inBackground: false });
  const icons = document.getElementById('zen-workspaces-button');
  const footer = document.getElementById('zen-sidebar-foot-buttons');
  const toolbar = document.getElementById('TabsToolbar');
  const visualProperties = ['border-top-width', 'border-top-left-radius', 'box-shadow', 'font-size', 'font-family'];
  const visualStyle = node => Object.fromEntries(visualProperties.map(key => [key, getComputedStyle(node).getPropertyValue(key)]));
  await SpecialPowers.pushPrefEnv({ set: [['assistencialize.workspaces.header-tabs', false]] });
  try {
    manager.applyAssistencializeLayout();
    const originalIconParent = icons.parentElement;
    const originalFooterParent = footer.parentElement;
    const originalToolbarParent = toolbar.parentElement;
    const button = icons.querySelector('toolbarbutton');
    const originalButtonStyle = visualStyle(button);
    const originalTabStyle = visualStyle(tab.querySelector('.tab-background'));
    await SpecialPowers.pushPrefEnv({ set: [['assistencialize.workspaces.header-tabs', true]] });
    try {
      manager.applyAssistencializeLayout();
      Assert.equal(toolbar.parentElement.id, 'assistencialize-tab-header');
      Assert.equal(toolbar.parentElement.parentElement.id, 'zen-appcontent-wrapper');
      Assert.equal(icons.parentElement.id, 'titlebar');
      Assert.equal(footer.parentElement.id, 'titlebar');
      Assert.equal(getComputedStyle(icons).flexDirection, 'column');
      Assert.equal(gBrowser.tabContainer.verticalMode, false);
      Assert.equal(gZenWorkspaces.activeWorkspace, workspaceId);
      Assert.deepEqual(visualStyle(button), originalButtonStyle, 'Workspace buttons keep Zen visual styling');
      Assert.deepEqual(visualStyle(tab.querySelector('.tab-background')), originalTabStyle, 'Tab surface keeps borders, radii and shadow');
      const header = toolbar.parentElement;
      manager.applyAssistencializeLayout();
      Assert.equal(toolbar.parentElement, header, 'Repeated layout reuses the header');
      Assert.equal(document.querySelectorAll('#assistencialize-tab-header').length, 1);
      await gZenWorkspaces.createAndSaveWorkspace('Header layout test');
      createdWorkspace = gZenWorkspaces.activeWorkspace;
      manager.applyAssistencializeLayout();
      Assert.equal(gZenWorkspaces.activeWorkspaceElement.scrollbox.getAttribute('orient'), 'horizontal', 'New workspaces use horizontal scrolling');
      await gZenWorkspaces.changeWorkspaceWithID(workspaceId);
      Assert.ok(!gZenWorkspaces.workspaceElement(createdWorkspace).active);
      Assert.equal(getComputedStyle(gZenWorkspaces.workspaceElement(createdWorkspace)).display, 'none');
    } finally {
      await SpecialPowers.popPrefEnv();
      manager.applyAssistencializeLayout();
    }
    Assert.equal(toolbar.parentElement, originalToolbarParent);
    Assert.equal(icons.parentElement, originalIconParent);
    Assert.equal(footer.parentElement, originalFooterParent);
    Assert.ok(!root.hasAttribute('assistencialize-header-tabs'));
  } finally {
    if (createdWorkspace) {
      await gZenWorkspaces.changeWorkspaceWithID(workspaceId);
      await gZenWorkspaces.removeWorkspace(createdWorkspace);
    }
    BrowserTestUtils.removeTab(tab);
    await SpecialPowers.popPrefEnv();
    manager.applyAssistencializeLayout();
  }
});
