/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

add_task(async function test_workspace_sessions_and_header() {
  const original = gZenWorkspaces.activeWorkspace;
  let spaceA, spaceB;
  const tabs = [];
  const open = async () => {
    const tab = gBrowser.addTrustedTab('https://example.com/', {
      inBackground: false, skipAnimation: true, skipRoute: true,
    });
    tabs.push(tab);
    await BrowserTestUtils.browserLoaded(tab.linkedBrowser, false, 'https://example.com/');
    return tab;
  };
  try {
    await gZenWorkspaces.createAndSaveWorkspace('Assistencialize A');
    spaceA = gZenWorkspaces.getActiveWorkspace();
    const a = await open();
    await SpecialPowers.spawn(a.linkedBrowser, [], () => {
      content.document.cookie = 'assistencialize_test=A; path=/';
      content.localStorage.setItem('assistencialize_test', 'A');
    });
    await gZenWorkspaces.createAndSaveWorkspace('Assistencialize B');
    spaceB = gZenWorkspaces.getActiveWorkspace();
    Assert.notEqual(spaceA.containerTabId, spaceB.containerTabId);
    const b = await open();
    await SpecialPowers.spawn(b.linkedBrowser, [], () => {
      Assert.ok(!content.document.cookie.includes('assistencialize_test=A'), 'Cookies are separate');
      Assert.equal(content.localStorage.getItem('assistencialize_test'), null, 'Storage is separate');
      content.document.cookie = 'assistencialize_test=B; path=/';
      content.localStorage.setItem('assistencialize_test', 'B');
    });
    Assert.equal(gZenWorkspaces.moveTabsToWorkspace([a], spaceB.uuid), false, 'Cannot move a live session across containers');
    Assert.equal(Number(a.getAttribute('usercontextid')), spaceA.containerTabId);
    await gZenWorkspaces.changeWorkspaceWithID(spaceA.uuid);
    await SpecialPowers.spawn(a.linkedBrowser, [], () => {
      Assert.ok(content.document.cookie.includes('assistencialize_test=A'));
      Assert.equal(content.localStorage.getItem('assistencialize_test'), 'A');
      content.document.cookie = 'assistencialize_test=; Max-Age=0; path=/';
      content.localStorage.removeItem('assistencialize_test');
    });
    Assert.equal(document.getElementById('TabsToolbar').parentElement.id, 'assistencialize-tab-header');
    Assert.ok(document.getElementById('titlebar').contains(document.getElementById('zen-workspaces-button')));
  } finally {
    for (const tab of tabs) {
      if (tab.isConnected) { BrowserTestUtils.removeTab(tab); }
    }
    await gZenWorkspaces.changeWorkspaceWithID(original);
    for (const space of [spaceA, spaceB]) {
      if (space) {
        Services.cookies.removeCookiesWithOriginAttributes(JSON.stringify({ userContextId: space.containerTabId }));
        await gZenWorkspaces.removeWorkspace(space.uuid);
      }
    }
  }
});
