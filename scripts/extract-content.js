import { isProbablyReaderable, Readability } from '@mozilla/readability';

const MIN_CONTENT_LENGTH = 100;
const MESSAGE_TYPE = 'can-i-cancel:page-content';

function canBeParsed(doc) {
  return isProbablyReaderable(doc, {
    minContentLength: MIN_CONTENT_LENGTH
  });
}

function extractReadableTextFromDocument(doc) {
  if (!canBeParsed(doc)) {
    return '';
  }

  const documentClone = doc.cloneNode(true);
  const article = new Readability(documentClone).parse();
  return article?.textContent?.trim() ?? '';
}

async function notifyBackground(payload) {
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPE,
      payload
    });
  } catch (error) {
    // If messaging fails, log locally so it appears in the inspected page console.
    console.error('Failed to notify background script', error);
  }
}

(async () => {
  try {
    const textContent = extractReadableTextFromDocument(window.document);
    await notifyBackground({ textContent });
  } catch (error) {
    console.error('Failed to extract readable content', error);
    await notifyBackground({
      textContent: '',
      error: error instanceof Error ? error.message : String(error)
    });
  }
})();
