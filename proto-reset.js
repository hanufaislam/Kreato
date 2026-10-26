// Prototype: refreshing the page restarts the setup journey from the beginning.
// Keeps the sign-up name + store link (dashboard step 1); clears storefront profile, assets and session setup.
// Moving between pages with links keeps progress — only a browser refresh resets it.
const KREATO_SETUP_KEYS = ['kreato-storefront', 'kreato-products', 'kreato-product-work', 'kreato-session'];
function resetKreatoSetup() { try { KREATO_SETUP_KEYS.forEach((k) => localStorage.removeItem(k)); } catch (e) {} }
(function () {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'reload') resetKreatoSetup();
  } catch (e) {}
})();
