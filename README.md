# Security Scan Chrome Extension

AI-powered security vulnerability analysis for web pages.

## Features

- 🔍 **Automated Security Analysis**: Scans web pages for potential security vulnerabilities
- 🤖 **AI-Powered**: Choose between Gemini 2.5 Flash (faster, cheaper) or Gemini 2.5 Pro (advanced, slower)
- 🎨 **User-Friendly Interface**: Clean, modern popup interface with color-coded results
- 🔒 **Privacy-Focused**: API key stored locally, no data sent to third parties
- ⚡ **Real-Time Analysis**: Instant feedback on current page security status
- ⚙️ **Flexible Model Selection**: Switch between speed/cost and advanced analysis

## Security Checks

The extension analyzes web pages for common vulnerabilities including:

- Cross-Site Scripting (XSS) vulnerabilities
- Cross-Site Request Forgery (CSRF) issues
- Insecure forms and data transmission
- Mixed content issues (HTTP resources on HTTPS pages)
- Missing security headers
- Insecure cookie configurations
- Outdated libraries or frameworks
- SQL injection risks
- Insecure redirects
- Information disclosure issues

## Installation

### Prerequisites

1. **OpenRouter API Key**: Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. **Chrome Browser**: Version 88 or higher (Manifest V3 support)

### Install the Extension

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in the top-right corner)
4. **Click "Load unpacked"** and select the `security-scan` directory
5. **Pin the extension** to your toolbar for easy access

## Setup

1. **Click the Security Scan icon** in your Chrome toolbar
2. **Enter your OpenRouter API Key** in the input field
3. **Select your preferred AI model**:
   - **Gemini 2.5 Flash**: Faster analysis, lower cost, good for quick scans
   - **Gemini 2.5 Pro**: More thorough analysis, higher cost, better for comprehensive audits
4. **Click "Save Settings"** to store your preferences securely
5. You're ready to start scanning!

## Usage

1. **Navigate** to any website you want to analyze
2. **Click the Security Scan icon** in your toolbar
3. **Click "Scan This Page"** to start the analysis
4. **Review the results** in the popup:
   - ✅ **Green**: No vulnerabilities found
   - 🟡 **Yellow**: Low severity issues
   - 🟠 **Orange**: Medium severity issues
   - 🔴 **Red**: High severity issues
   - 🟣 **Purple**: Critical severity issues


## Technical Details

### Architecture

- **Manifest V3**: Modern Chrome extension architecture
- **Content Scripts**: Extract page content for analysis
- **Background Service Worker**: Handles API communication
- **Popup Interface**: User interaction and results display

### API Integration

- **Service**: OpenRouter API
- **Models**: 
  - Google Gemini 2.5 Flash (default - faster, cheaper)
  - Google Gemini 2.5 Pro (advanced - more thorough, slower, more expensive)
- **Analysis**: Comprehensive security vulnerability detection
- **Response Format**: Structured JSON with severity levels

### Permissions

- `activeTab`: Access current tab content for analysis
- `storage`: Store API key securely
- `host_permissions`: Access OpenRouter API

## File Structure

```
security-scan/
├── manifest.json          # Extension configuration
├── popup.html             # Main UI interface
├── popup.css              # UI styling
├── popup.js               # Popup functionality
├── content.js             # Content script
├── background.js          # Background service worker
├── convert-icons.sh       # SVG to PNG conversion script
├── icons/                 # Extension icons
│   ├── icon.svg           # Main icon
│   ├── icon16.svg         # 16px toolbar icon
│   ├── icon48.svg         # 48px management icon
│   ├── icon128.svg        # 128px store icon
│   └── README.md          # Icon documentation
└── README.md              # This file
```

## Development

### Running Locally

1. Clone the repository
2. Load the extension in developer mode
3. Make changes to the source files
4. Reload the extension in `chrome://extensions/`

### API Key for Development

For development and testing, you'll need:
- OpenRouter account
- API key with credits
- Access to Google Gemini models

## Troubleshooting

### Common Issues

**"API key not found"**
- Ensure you've entered and saved your OpenRouter API key
- Check that the key is valid and has sufficient credits

**"Failed to extract page content"**
- Some pages may block content extraction
- Try refreshing the page and scanning again
- Check browser console for detailed error messages

**"OpenRouter API error"**
- Verify your API key is correct and active
- Check your OpenRouter account for credit balance
- Ensure you have access to the Gemini model

### Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your OpenRouter API key and credits
3. Ensure you're on a supported website (some sites may block analysis)

## Privacy & Security

- **Local Storage**: API keys are stored locally in Chrome's secure storage
- **No Data Collection**: The extension doesn't collect or store browsing data
- **Direct API Calls**: Analysis requests go directly to OpenRouter
- **Content Limitations**: Page content is limited and filtered before analysis

## License

This project is open source. Please review the license file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

---

**Note**: This extension requires an active OpenRouter API key and internet connection to function. Analysis quality depends on the AI model's capabilities and training data. 