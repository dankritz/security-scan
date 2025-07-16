// Background service worker for Security Scan extension

class SecurityAnalyzer {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'analyzeSecurity') {
        this.analyzeSecurityVulnerabilities(request.content, request.url, request.model)
          .then(result => sendResponse(result))
          .catch(error => sendResponse({ error: error.message }));
        return true; // Will respond asynchronously
      }
    });
  }

  async analyzeSecurityVulnerabilities(content, url, model = 'google/gemini-2.5-flash') {
    try {
      // Get API key from storage
      const result = await chrome.storage.sync.get(['openrouterApiKey']);
      if (!result.openrouterApiKey) {
        throw new Error('OpenRouter API key not found. Please set it in the extension popup.');
      }

      // Prepare content for analysis
      const analysisContent = this.prepareContentForAnalysis(content, url);
      
      // Create prompt for security analysis
      const prompt = this.createSecurityAnalysisPrompt(analysisContent, model);

      // Call OpenRouter API
      const response = await this.callOpenRouterAPI(result.openrouterApiKey, prompt, model);
      
      // Parse and return results
      return this.parseAnalysisResponse(response, model);
    } catch (error) {
      console.error('Security analysis error:', error);
      // Include model info in error for debugging
      error.model = model;
      throw error;
    }
  }

  prepareContentForAnalysis(content, url) {
    return {
      url: url,
      htmlSnippet: content.html.substring(0, 20000), // Limit HTML content
      scripts: content.scripts.slice(0, 10), // Limit to 10 scripts
      forms: content.forms,
      links: content.links.slice(0, 20), // Limit to 20 links
      metaTags: content.meta
    };
  }

  createSecurityAnalysisPrompt(content, model = 'google/gemini-2.5-flash') {
    const isProModel = model.includes('pro');
    
    return `You are a security expert analyzing a web page for potential vulnerabilities. Please analyze the following content and identify security issues.

URL: ${content.url}

HTML Content (snippet):
${content.htmlSnippet}

Scripts:
${JSON.stringify(content.scripts, null, 2)}

Forms:
${JSON.stringify(content.forms, null, 2)}

Links (sample):
${JSON.stringify(content.links, null, 2)}

Meta Tags:
${JSON.stringify(content.metaTags, null, 2)}

Please analyze this content and identify potential security vulnerabilities. For each vulnerability found, provide:
1. Title: A brief, clear title
2. Description: A detailed explanation of the vulnerability
3. Severity: One of "low", "medium", "high", "critical"

Focus on common web security issues like:
- XSS vulnerabilities
- CSRF vulnerabilities  
- Insecure forms (missing CSRF tokens, HTTP forms for sensitive data)
- Mixed content issues (HTTP resources on HTTPS pages)
- Insecure cookies
- Missing security headers
- Outdated libraries or frameworks
- SQL injection risks
- Insecure redirects
- Information disclosure

${isProModel ? 'GEMINI PRO - ' : ''}CRITICAL: Respond with ONLY a valid JSON object in this exact format. Do not include any explanatory text, code blocks, or markdown formatting:

{
  "vulnerabilities": [
    {
      "title": "Vulnerability Title",
      "description": "Detailed description of the vulnerability and its implications", 
      "severity": "low"
    }
  ]
}

IMPORTANT RULES:
- Return ONLY the JSON object, no other text
- Use only these severity levels: "low", "medium", "high", "critical"
- Each vulnerability must have exactly these three fields: title, description, severity
- If no vulnerabilities are found, return: {"vulnerabilities": []}
- Do not wrap the JSON in code blocks or markdown
${isProModel ? '- GEMINI PRO: Be extra careful to return only raw JSON without any formatting' : ''}`;
  }

  async callOpenRouterAPI(apiKey, prompt, model = 'google/gemini-2.5-flash') {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'Security Scan Extension'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: model.includes('pro') ? 4000 : 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}. ${errorData}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  parseAnalysisResponse(responseText, model = 'unknown') {
    try {
      console.log('Raw response text:', responseText);
      
      // Try multiple parsing strategies
      let analysis = null;
      
      // Strategy 1: Try to find and parse the last complete JSON object
      const jsonMatches = responseText.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try the last JSON match (most likely to be complete)
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(jsonMatches[i]);
            if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
              analysis = parsed;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      // Strategy 2: Try to extract JSON between code blocks
      if (!analysis) {
        // First try to find content between ```json and ``` or ``` and ```
        const codeBlockPatterns = [
          /```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi,
          /```(?:json)?\s*([\s\S]*?)\s*```/gi
        ];
        
        for (const pattern of codeBlockPatterns) {
          const matches = [...responseText.matchAll(pattern)];
          for (const match of matches) {
            try {
              let jsonContent = match[1].trim();
              
              // If it doesn't start with {, look for the first { 
              if (!jsonContent.startsWith('{')) {
                const firstBrace = jsonContent.indexOf('{');
                if (firstBrace !== -1) {
                  jsonContent = jsonContent.substring(firstBrace);
                }
              }
              
              // Try to find a complete JSON object by counting braces
              let braceCount = 0;
              let endIndex = -1;
              for (let i = 0; i < jsonContent.length; i++) {
                if (jsonContent[i] === '{') braceCount++;
                if (jsonContent[i] === '}') braceCount--;
                if (braceCount === 0 && jsonContent[i] === '}') {
                  endIndex = i + 1;
                  break;
                }
              }
              
              if (endIndex > 0) {
                const completeJson = jsonContent.substring(0, endIndex);
                const parsed = JSON.parse(completeJson);
                if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
                  analysis = parsed;
                  console.log('Successfully parsed JSON from code block');
                  break;
                }
              }
            } catch (e) {
              console.log('Code block parsing attempt failed:', e.message);
              continue;
            }
          }
          if (analysis) break;
        }
      }
      
      // Strategy 2.5: Specific handling for ```json blocks
      if (!analysis) {
        const jsonBlockStart = responseText.indexOf('```json');
        const jsonBlockEnd = responseText.indexOf('```', jsonBlockStart + 7);
        
        if (jsonBlockStart !== -1 && jsonBlockEnd !== -1) {
          try {
            let jsonContent = responseText.substring(jsonBlockStart + 7, jsonBlockEnd).trim();
            const parsed = JSON.parse(jsonContent);
            if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
              analysis = parsed;
              console.log('Successfully parsed JSON from ```json block');
            }
          } catch (e) {
            console.log('```json block parsing failed:', e.message);
          }
        }
      }
      
      // Strategy 3: Try to parse the entire response as JSON
      if (!analysis) {
        try {
          const parsed = JSON.parse(responseText.trim());
          if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
            analysis = parsed;
          }
        } catch (e) {
          console.log('Direct parsing failed:', e);
        }
      }
      
      // Strategy 4: Look for vulnerabilities array specifically
      if (!analysis) {
        const vulnArrayMatch = responseText.match(/"vulnerabilities"\s*:\s*\[([\s\S]*?)\]/);
        if (vulnArrayMatch) {
          try {
            const mockJson = `{"vulnerabilities": [${vulnArrayMatch[1]}]}`;
            const parsed = JSON.parse(mockJson);
            if (parsed.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
              analysis = parsed;
            }
          } catch (e) {
            console.log('Vulnerabilities array parsing failed:', e);
          }
        }
      }
      
      if (!analysis) {
        console.error('All parsing strategies failed for model:', model);
        console.error('Response text length:', responseText.length);
        console.error('First 500 chars:', responseText.substring(0, 500));
        console.error('Last 500 chars:', responseText.substring(Math.max(0, responseText.length - 500)));
        
        // Include response preview in error message for debugging
        const preview = responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '');
        throw new Error(`No valid JSON structure found in ${model} response. Preview: ${preview}`);
      }
      
      // Validate and clean vulnerabilities
      if (!Array.isArray(analysis.vulnerabilities)) {
        throw new Error('Vulnerabilities is not an array');
      }
      
      // Validate each vulnerability
      analysis.vulnerabilities = analysis.vulnerabilities.filter(vuln => {
        const isValid = vuln && 
                       typeof vuln.title === 'string' && 
                       typeof vuln.description === 'string' && 
                       typeof vuln.severity === 'string' &&
                       ['low', 'medium', 'high', 'critical'].includes(vuln.severity.toLowerCase());
        
        if (!isValid) {
          console.warn('Filtered out invalid vulnerability:', vuln);
        }
        
        return isValid;
      });
      
      // Normalize severity to lowercase
      analysis.vulnerabilities.forEach(vuln => {
        vuln.severity = vuln.severity.toLowerCase();
      });

      console.log('Successfully parsed analysis with', analysis.vulnerabilities.length, 'vulnerabilities');
      return { analysis };
      
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      console.error('Response text length:', responseText?.length || 'undefined');
      console.error('Response preview:', responseText?.substring(0, 1000) || 'undefined');
      throw new Error(`Failed to parse AI response: ${error.message}. Please try again.`);
    }
  }
}

// Initialize the security analyzer
new SecurityAnalyzer(); 