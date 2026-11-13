import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureWorkspaceContainer, canMoveToContainer, isolateRestoredTabs } from '../src/zen/spaces/AssistencializeIsolation.mjs';

function profile() {
  const map = new Map(), identities = new Map();
  let next = 10;
  return {
    prefs: { getIntPref: (k, d) => map.get(k) ?? d, setIntPref: (k, v) => map.set(k, v) },
    identities: {
      getPublicIdentityFromId: id => identities.get(id),
      create: () => { const identity = { userContextId: next++ }; identities.set(identity.userContextId, identity); return identity; },
    },
  };
}

test('same-name workspaces get separate identities; renaming and restored windows reuse the identity', () => {
  const { identities, prefs } = profile();
  const a = { uuid: 'a', name: 'WhatsApp' }, b = { uuid: 'b', name: 'WhatsApp' };
  const id = ensureWorkspaceContainer(a, identities, prefs);
  assert.notEqual(ensureWorkspaceContainer(b, identities, prefs), id);
  assert.equal(ensureWorkspaceContainer({ uuid: 'a', name: 'Renamed', containerTabId: 1234 }, identities, prefs), id);
});

test('synced IDs from another local profile are never trusted', () => {
  const { identities, prefs } = profile();
  assert.equal(ensureWorkspaceContainer({ uuid: 'a', containerTabId: 999 }, identities, prefs), 10);
  assert.throws(() => ensureWorkspaceContainer({}, identities, prefs));
});

test('mixed-container moves are rejected atomically', () => {
  const tab = id => ({ hasAttribute: () => false, getAttribute: () => id });
  assert.equal(canMoveToContainer([tab('10'), tab('11')], 10), false);
  assert.equal(canMoveToContainer([tab('10')], 10), true);
  assert.equal(canMoveToContainer([tab(null)], 10), false);
});

test('legacy restore migrates URLs, strips form, POST and storage data, and is idempotent', () => {
  const workspace = { uuid: 'a', containerTabId: 10 };
  const states = [{ zenWorkspace: 'a', userContextId: 0, entries: [{ url: 'https://web.whatsapp.com/', title: 'WhatsApp', postdata_b64: 'private', triggeringPrincipal_base64: 'old' }], index: 1, storage: { secret: 'value' }, formdata: { password: 'value' } }];
  isolateRestoredTabs(states, [workspace], workspace);
  assert.equal(states[0].userContextId, 10);
  assert.deepEqual(states[0].entries, [{ url: 'https://web.whatsapp.com/', title: 'WhatsApp' }]);
  assert.equal(states[0].storage, undefined);
  assert.equal(states[0].formdata, undefined);
  const saved = structuredClone(states);
  isolateRestoredTabs(states, [workspace], workspace);
  assert.deepEqual(states, saved);
});

test('orphaned restored tab uses active workspace; missing workspace fails closed', () => {
  const active = { uuid: 'a', containerTabId: 10 };
  const states = [{ zenWorkspace: 'deleted', userContextId: 20, entries: [] }];
  isolateRestoredTabs(states, [active], active);
  assert.equal(states[0].zenWorkspace, 'a');
  assert.throws(() => isolateRestoredTabs([{}], [], undefined));
});
