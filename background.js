const MESSAGE_TYPES = {
  pageContent: 'can-i-cancel:page-content',
  requestSummary: 'can-i-cancel:request-summary'
};

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set side panel behavior', error));

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.type === MESSAGE_TYPES.pageContent) {
    const { textContent = '', error } = message.payload ?? {};
    const update = {
      pageContent: textContent
    };
    if (error) {
      console.error('Content extraction error', error);
      update.pageContentError = error;
    } else {
      update.pageContentError = null;
    }

    chrome.storage.session
      .set(update)
      .catch((storageError) =>
        console.error('Failed to update session storage with page content', storageError)
      );
    return;
  }

  if (message.type === MESSAGE_TYPES.requestSummary) {
    handleSummaryRequest()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error('Failed to handle summary request', error);
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    return true;
  }
});

async function handleSummaryRequest() {
  const tabId = await getActiveTabId();
  if (tabId == null) {
    await chrome.storage.session.set({
      pageContent: '',
      pageContentError: 'No active tab available for summarization.'
    });
    throw new Error('No active tab available for summarization.');
  }
  await showSummary(tabId);
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });
  if (!tab || tab.id == null) {
    return null;
  }
  return tab.id;
}

async function showSummary(tabId) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab?.url || !tab.url.startsWith('http')) {
    await chrome.storage.session.set({
      pageContent: '',
      pageContentError: 'Unable to summarize this type of page.'
    });
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['scripts/extract-content.js']
    });
  } catch (error) {
    console.error('Failed to inject extraction script', error);
    await chrome.storage.session.set({
      pageContent: '',
      pageContentError: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
