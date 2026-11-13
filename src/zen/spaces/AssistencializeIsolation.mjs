/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// IDs belong to the local Firefox profile, never to synced workspace data.
export function ensureWorkspaceContainer(workspace, identities, prefs) {
  if (!workspace?.uuid) {
    throw new Error('Workspace identity is required');
  }
  const key = `assistencialize.workspace-container.${workspace.uuid}`;
  let id = prefs.getIntPref(key, 0);
  if (!id || !identities.getPublicIdentityFromId(id)) {
    id = identities.create(`Assistencialize — ${workspace.name}`, 'fingerprint', 'blue').userContextId;
    prefs.setIntPref(key, id);
  }
  workspace.containerTabId = id;
  return id;
}

// Moving a live docshell does not change its originAttributes. Reject a move
// rather than displaying another workspace's authenticated session there.
export function canMoveToContainer(tabs, userContextId) {
  return tabs.every(tab => tab.hasAttribute('zen-empty-tab') ||
    Number(tab.getAttribute('usercontextid') || 0) === userContextId);
}

export function isolateRestoredTabs(states, workspaces, activeWorkspace) {
  for (const state of states || []) {
    const workspace = workspaces.find(w => w.uuid === state.zenWorkspace) || activeWorkspace;
    if (!workspace) {
      throw new Error('Cannot restore a tab without an isolated workspace');
    }
    if (state.userContextId === workspace.containerTabId) {
      continue;
    }
    // Legacy state may contain sessionStorage, principals, form data and POST
    // bodies from another container. Migrate URLs only, never those sessions.
    const oldEntries = state.entries || [];
    const entries = oldEntries.map(entry => ({ url: entry.url, title: entry.title }));
    const index = state.index;
    const pinned = state.pinned;
    for (const key of Object.keys(state)) {
      delete state[key];
    }
    Object.assign(state, { entries, index, pinned, zenWorkspace: workspace.uuid,
      userContextId: workspace.containerTabId });
  }
}
