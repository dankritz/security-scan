// Popup script for Security Scan extension

// This function will be injected into web pages to extract content
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

class SecurityScanPopup {
  constructor() {
    this.init();
  }

  async init() {
    // Load saved settings
    const result = await chrome.storage.sync.get(['openrouterApiKey', 'selectedModel']);
    if (result.openrouterApiKey) {
      document.getElementById('apiKey').value = result.openrouterApiKey;
      this.showScanSection();
    }
    
    // Set saved model or default to flash
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.value = result.selectedModel || 'google/gemini-2.5-flash';

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Save API key
    document.getElementById('saveApiKey').addEventListener('click', () => {
      this.saveApiKey();
    });

    // Scan button
    document.getElementById('scanButton').addEventListener('click', () => {
      this.startScan();
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showApiKeySection();
    });

    // Enter key for API key input
    document.getElementById('apiKey').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveApiKey();
      }
    });
  }

  async saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const selectedModel = document.getElementById('modelSelect').value;
    
    if (!apiKey) {
      this.showError('Please enter a valid API key');
      return;
    }

    try {
      await chrome.storage.sync.set({ 
        openrouterApiKey: apiKey,
        selectedModel: selectedModel
      });
      this.showScanSection();
      this.hideError();
    } catch (error) {
      this.showError('Failed to save settings');
    }
  }

  showScanSection() {
    document.getElementById('apiKeySection').style.display = 'none';
    document.getElementById('scanSection').style.display = 'block';
  }

  showApiKeySection() {
    document.getElementById('apiKeySection').style.display = 'block';
    document.getElementById('scanSection').style.display = 'none';
    this.hideResults();
    this.hideError();
  }

  async startScan() {
    const scanButton = document.getElementById('scanButton');
    const btnText = scanButton.querySelector('.btn-text');
    const btnLoading = scanButton.querySelector('.btn-loading');
    
    // Get selected model for display
    const settings = await chrome.storage.sync.get(['selectedModel']);
    const selectedModel = settings.selectedModel || 'google/gemini-2.5-flash';
    const modelName = selectedModel.includes('pro') ? 'Gemini Pro' : 'Gemini Flash';
    
    // Show loading state with model info
    btnText.style.display = 'none';
    btnLoading.innerHTML = `⏳ Scanning with ${modelName}...`;
    btnLoading.style.display = 'inline';
    scanButton.disabled = true;
    
    this.hideResults();
    this.hideError();

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Inject content script and get page content
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractPageContent
      });

      if (!result.result) {
        throw new Error('Failed to extract page content');
      }

      // Use the already retrieved selectedModel from above

      // Send to background script for AI analysis
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeSecurity',
        content: result.result,
        url: tab.url,
        model: selectedModel
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.displayResults(response.analysis);
    } catch (error) {
      this.showError(error.message);
    } finally {
      // Reset button state
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      scanButton.disabled = false;
    }
  }



  displayResults(analysis) {
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    
    if (!analysis || !analysis.vulnerabilities || analysis.vulnerabilities.length === 0) {
      resultsContent.innerHTML = '<div class="no-vulnerabilities">✅ No security vulnerabilities detected!</div>';
    } else {
      const vulnerabilitiesHtml = analysis.vulnerabilities.map(vuln => `
        <div class="vulnerability ${vuln.severity}">
          <div class="vulnerability-title">${this.escapeHtml(vuln.title)}</div>
          <div class="vulnerability-description">${this.escapeHtml(vuln.description)}</div>
          <span class="vulnerability-severity severity-${vuln.severity}">${vuln.severity}</span>
        </div>
      `).join('');
      
      resultsContent.innerHTML = vulnerabilitiesHtml;
    }
    
    resultsDiv.style.display = 'block';
  }

  showError(message) {
    const errorDiv = document.getElementById('error');
    const errorContent = document.getElementById('errorContent');
    errorContent.textContent = message;
    errorDiv.style.display = 'block';
  }

  hideError() {
    document.getElementById('error').style.display = 'none';
  }

  hideResults() {
    document.getElementById('results').style.display = 'none';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SecurityScanPopup();
}); 