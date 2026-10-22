// VDF Viewer — background worker.
// Opens the viewer in a new tab when the toolbar icon is clicked.
// ("service_worker" is used by Chrome/Edge; "scripts" by Firefox — both keys
// are declared in manifest.json so one build loads in every browser.)
/* eslint-env serviceworker */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
});
