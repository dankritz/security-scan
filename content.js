// Content script for Security Scan extension
// This script runs in the context of web pages

// Simple content script - main functionality is handled by injected scripts from popup
console.log('Security Scan extension content script loaded');

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageContent') {
    try {
      const content = extractPageContent();
      sendResponse({ success: true, content });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

function extractPageContent() {
  const content = {
    html: document.documentElement.outerHTML.substring(0, 50000), // Limit to 50KB
    scripts: Array.from(document.scripts).map(script => ({
      src: script.src,
      content: script.innerHTML.substring(0, 10000) // Limit each script to 10KB
    })).filter(script => script.src || script.content),
    forms: Array.from(document.forms).map(form => ({
      action: form.action,
      method: form.method,
      inputs: Array.from(form.elements).map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        required: input.required
      }))
    })),
    links: Array.from(document.links).map(link => ({
      href: link.href,
      text: link.textContent.trim().substring(0, 100)
    })).slice(0, 50), // Limit to 50 links
    meta: Array.from(document.head.querySelectorAll('meta')).map(meta => ({
      name: meta.name || meta.property,
      content: meta.content
    }))
  };
  
  return content;
} 