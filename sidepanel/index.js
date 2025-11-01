/* global LanguageModel */
import { marked } from 'marked';

const MESSAGE_TYPES = {
  requestSummary: 'can-i-cancel:request-summary'
};

const STORAGE_KEYS = ['pageContent', 'pageContentError'];

let pageContent = '';
let pageContentError = null;
let isProcessing = false;
const loadingElement = document.querySelector('#llm-loading');
const reviewButton = document.querySelector('#submit-review');
const summaryElement = document.querySelector('#result-summary');

const modelResponseSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TOS Lite (Simplified for On-Device Model)",
  "type": "object",
  "properties": {
    "cancellation": {
      "type": "object",
      "properties": {
        "allowed": { "type": "string" },
        "earliest_time": { "type": "string" },
        "min_term": { "type": "string" },
        "notice_required": { "type": "string" },
        "methods": { "type": "string" },
        "effective": { "type": "string" },
        "early_termination_fee": { "type": "string" },
        "device_return_required": { "type": "string" },
        "exceptions": { "type": "string" }
      }
    },
    "returns": {
      "type": "object",
      "properties": {
        "allowed": { "type": "string" },
        "eligibility_window": { "type": "string" },
        "condition": { "type": "string" },
        "rma_required": { "type": "string" },
        "restocking_fee": { "type": "string" },
        "return_shipping_payer": { "type": "string" },
        "non_returnable_items": { "type": "string" },
        "how_to_initiate": { "type": "string" },
        "inspection_time_days": { "type": "string" }
      }
    },
    "refunds": {
      "type": "object",
      "properties": {
        "allowed": { "type": "string" },
        "eligibility": { "type": "string" },
        "calculation": { "type": "string" },
        "method": { "type": "string" },
        "processing_time_days": { "type": "string" },
        "deductions": { "type": "string" },
        "non_refundable_charges": { "type": "string" }
      }
    },
    "other_fees": {
      "type": "object",
      "properties": {
        "setup_or_activation_fee": { "type": "string" },
        "account_or_admin_fee": { "type": "string" },
        "paper_billing_fee": { "type": "string" },
        "shipping_or_handling": { "type": "string" },
        "return_label_or_pickup_fee": { "type": "string" },
        "device_non_return_fee": { "type": "string" },
        "reconnection_or_reactivation_fee": { "type": "string" },
        "upgrade_or_downgrade_fee": { "type": "string" },
        "early_cancellation_extra_fees": { "type": "string" },
        "late_payment_fee": { "type": "string" },
        "chargeback_fee": { "type": "string" },
        "environmental_or_recycling_fee": { "type": "string" },
        "customs_duties_or_taxes": { "type": "string" },
        "convenience_or_service_charge": { "type": "string" },
        "other_notes": { "type": "string" },
        "all_fees_raw": { "type": "string" }
      }
    }
  }
}
if (reviewButton) {
  reviewButton.addEventListener('click', onReviewClick);
}
titlePanel.renderTitleStylePanel("title-div", "CAN I CANCEL ?")

// Function to handle trigger events

chrome.storage.session.get(STORAGE_KEYS, (items) => {
  onContentChange(items.pageContent ?? '', items.pageContentError ?? null);
});

chrome.storage.session.onChanged.addListener((changes) => {
  const hasPageContent = Object.prototype.hasOwnProperty.call(changes, 'pageContent');
  const hasError = Object.prototype.hasOwnProperty.call(changes, 'pageContentError');
  if (!hasPageContent && !hasError) {
    return;
  }

  const newContent = hasPageContent ? changes.pageContent.newValue : pageContent;
  const newError = hasError ? changes.pageContentError.newValue : pageContentError;
  onContentChange(newContent ?? '', newError ?? null);
});

async function onReviewClick() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  setLoading(true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.requestSummary
    });

    if (response && response.ok === false) {
      throw new Error(response.error || 'Unable to start summarization.');
    }
  } catch (error) {
    console.error('Failed to request summary', error);
    showSummary('Error requesting summary. Please ensure the page is accessible and try again.');
    setLoading(false);
    isProcessing = false;
  }
}

async function onContentChange(newContent, newError) {
  const contentChanged = pageContent !== newContent;
  const errorChanged = pageContentError !== newError;

  if (!contentChanged && !errorChanged) {
    return;
  }

  pageContent = newContent ?? '';
  pageContentError = newError ?? null;

  if (pageContentError) {
    setLoading(false);
    showSummary(`Error: ${pageContentError}`);
    isProcessing = false;
    return;
  }

  if (!pageContent) {
    if (isProcessing) {
      showSummary("There's nothing to summarize");
      setLoading(false);
      isProcessing = false;
    }
    return;
  }

  setLoading(true);

  try {
    const modelResponse = await promptLanguageModel(pageContent);
    handleLanguageModelResponse(modelResponse);
  } finally {
    setLoading(false);
    isProcessing = false;
  }
}

// Functions to handle model calling and prompting

async function promptTermsDetails(session, text) {
  let prompt = `
    The following text describes the terms and services to a subscription or service. 
    Determine the terms for cancellation, any cancellation fee, terms of return, any refund fee.
    if any of the information is not available return "na" only.
    for available information add specific details like contact info, amount, days and other information.

    Here is the text: 
    ${text.slice(0, 30000)}
  `;

  const result = await session.prompt(
    prompt,
    {
      responseConstraint: modelResponseSchema
    }
  );
  return result;
}

async function promptLanguageModel(text) {
  try {
    const availability = await LanguageModel.availability();

    if (availability === 'unavailable') {
      return {
        'status': 'error',
        'msg': 'Language Model is not available in this browser.'
      };
    }

    const session = await LanguageModel.create({
      temperature: 0,
      topK: 1.0,
      expectedOutputs: [
        { type: "text", languages: ["en"] }
      ]
    });

    if (availability !== 'available') {
      session.addEventListener('downloadprogress', (event) => {
        console.log(`Downloaded ${Math.round(event.loaded * 100)}%`);
      });
      await session.ready;
    }

    try {
      const summary = await promptTermsDetails(session, text);
      return {
        'status': 'success',
        'msg': JSON.parse(summary)
      };
    } finally {
      session.destroy();
    }
  } catch (error) {
    console.error('Summary generation failed', error);
    return {
      'status': 'error',
      'msg': `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Function to handle html display components and status updates

function setLoading(isLoading) {
  if (loadingElement) {
    loadingElement.classList.toggle('hidden', !isLoading);
  }
  if (reviewButton) {
    reviewButton.classList.toggle('hidden', isLoading);
  }
  if (summaryElement) {
    summaryElement.classList.toggle('hidden', isLoading);
  }
}

function handleLanguageModelResponse(llmResponse) {
  if (llmResponse.status === "success") {
    showSummaryTable(llmResponse.msg)
  }
}

function showSummary(text) {
  if (!summaryElement) {
    return;
  }

  const safeText = typeof text === 'string' ? text : '';
  showSummaryText(marked.parse(safeText));
}

function showSummaryText(message) {
  const html = `
    <div class="flex justify-center items-center text-center text-base font-medium text-gray-800 p-2">
      ${message}
    </div>
  `;
  summaryElement.innerHTML = html;
}

function showSummaryTable(termsJson) {
  const html = window.buildTermsTablesHTML(termsJson, {
    naToken: "NA",
    sectionOrder: ["cancellation", "returns", "refunds", "other_fees"]
  });
  summaryElement.innerHTML = html;
}
