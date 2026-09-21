// ─────────────────────────────────────────────────────────────────────────────
// controllerManager.js — dispatches to the active SDN controller adapter.
// The rest of the app calls these common functions and never imports an
// adapter directly, so NetworkSlicing.jsx / the Topology page / the Intent
// Engine stay controller-independent (no "if ONOS..." scattered around).
//
// Plain module state, not React context: Header.jsx owns the reactive UI
// state (for re-rendering the selector/status dot) and calls
// setActiveController() as a side effect; this module is what everything
// else reads synchronously when it needs to know which adapter to use.
// ─────────────────────────────────────────────────────────────────────────────
import * as odlController from './controllers/odlController';
import * as onosController from './controllers/onosController';

export const CONTROLLERS = {
    odl: { key: 'odl', label: 'OpenDaylight', adapter: odlController },
    onos: { key: 'onos', label: 'ONOS', adapter: onosController },
};

const STORAGE_KEY = 'active_controller';
let active = localStorage.getItem(STORAGE_KEY) in CONTROLLERS
    ? localStorage.getItem(STORAGE_KEY)
    : 'odl';

export function setActiveController(key) {
    if (!CONTROLLERS[key]) throw new Error(`Unknown controller: ${key}`);
    active = key;
    localStorage.setItem(STORAGE_KEY, key);
    // Plain module state has no subscribers by default — any page mounted
    // elsewhere (Header's own selector, Tools' selector, anything future)
    // needs this to know the active controller changed without requiring a
    // navigation/remount to pick up the new value.
    window.dispatchEvent(new CustomEvent('sdn:controller-changed', { detail: key }));
}

export function getActiveController() {
    return active;
}

function adapter() {
    return CONTROLLERS[active].adapter;
}

// Common interface — implemented by both adapters.
export const getTopology = (...args) => adapter().getTopology(...args);
export const getDevices = (...args) => adapter().getDevices(...args);
export const getHosts = (...args) => adapter().getHosts(...args);
export const getControllerStatus = (...args) => adapter().getControllerStatus(...args);
export const getFlows = (...args) => adapter().getFlows(...args);
export const getStatistics = (...args) => adapter().getStatistics(...args);
