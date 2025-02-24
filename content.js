// Listen for clicks on the extension icon
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyze") {
        improveDraft();
    }
});

async function improveDraft() {
    const subjectInput = document.querySelector('input[name="subjectbox"]');
    const draftContent = document.querySelector('div[aria-label="Message Body"]');
    
    const recipientElement = document.querySelector('span[email]');
    let recipient = '[Recipient Name]';
    
    if (recipientElement) {
        // Try to get the display name first
        const displayName = recipientElement.textContent.trim();
        if (displayName) {
            // Get first name only
            recipient = displayName.split(' ')[0];
        } else {
            // Fallback to email address
            const email = recipientElement.getAttribute('email');
            recipient = email ? email.split('@')[0] : '[Recipient Name]';
        }
    }

    console.log("Recipient", recipient);
    
    if (!draftContent) {
        console.log('No draft currently open');
        return;
    }

    // Get both HTML and plain text content
    const htmlContent = draftContent.innerHTML;
    const textContent = draftContent.innerText;

    // Regex patterns for precise email header matching
    const headerPatterns = [
        // HTML Gmail reply header format
        /<div dir="ltr" class="gmail_attr">On (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} at \d{1,2}:\d{2}(?: [AP]M)?, .+? &lt;.+?&gt; wrote:<\/div>/,
        
        // Plain text Gmail reply header format (fallback)
        /On (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} at \d{1,2}:\d{2}(?: [AP]M)?, .+? (?:<[^>]+>|&lt;.+?&gt;) wrote:/,
        
        // Gmail forwarded message marker (both formats)
        /<div dir="ltr" class="gmail_attr">---------- Forwarded message ---------<\/div>/,
        /\n\n---------- Forwarded message ---------/
    ];
    
    // Find existing content (replies, forwards) using regex patterns
    let existingHtmlContent = '';
    let existingTextContent = '';
    let text = textContent;

    for (const pattern of headerPatterns) {
        const htmlMatch = htmlContent.match(pattern);
        const textMatch = textContent.match(pattern);
        
        if (htmlMatch) {
            const matchIndex = htmlMatch.index;
            existingHtmlContent = htmlContent.substring(matchIndex);
            text = textContent.substring(0, matchIndex).trim();
            break;
        }
        
        if (textMatch) {
            const matchIndex = textMatch.index;
            existingTextContent = textContent.substring(matchIndex);
            text = textContent.substring(0, matchIndex).trim();
            break;
        }
    }

    const subject = subjectInput ? subjectInput.value : '';
    
    console.log('📧 Original draft:', {
        subject: subject,
        body: text
    });

    try {
        const response = await fetch(`${config.API_ENDPOINT}?key=${config.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Rewrite this email to be more professional, maintaining the same core message but with improved language and structure. Use consistent formatting with exactly one blank line between paragraphs. Use "${recipient}" as the recipient name if provided. Keep any original signature if found, otherwise use [Your Name]. Format your response exactly like this:
                        SUBJECT: [subject line]
                        ---
                        Most fitting greeting e.g Dear, Hi, Hey, etc. for ${recipient},

                        [email body with consistent single-line spacing between paragraphs]

                        Most suitable sign off message e.g Thanks, Best Regards, Sincerely etc.,

                        [original signature / signer or [Your Name]]
                        
                        Original email:
                        Subject: ${subject}
                        Body: ${text}`
                    }]
                }]
            })
        });

        const data = await response.json();
        const improvedVersion = data.candidates[0].content.parts[0].text;
        
        // Parse the improved version
        const [improvedSubject, improvedBody, improvedSignature] = improvedVersion.split('---').map(s => s.trim());
        
        // Update the email fields
        if (subjectInput && improvedSubject.startsWith('SUBJECT:')) {
            subjectInput.value = improvedSubject.replace('SUBJECT:', '').trim();
            // Trigger input event to ensure Gmail registers the change
            subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (draftContent) {
            // Combine the body and signature
            let cleanContent = `${improvedBody}\n\n${improvedSignature}`;
            
            // Clean up any trailing 'undefined'
            if (cleanContent.endsWith('\n\nundefined')) {
                cleanContent = cleanContent.slice(0, -11);
            } else if (cleanContent.endsWith('undefined')) {
                cleanContent = cleanContent.slice(0, -9);
            }
            
            // Normalize line breaks
            cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();
            
            // Convert line breaks to <br> tags for the new draft content
            const formattedDraft = cleanContent.split('\n').join('<br>\n');
            
            // Always preserve the existing content if we found it
            if (existingHtmlContent || existingTextContent) {
                const existingContent = existingHtmlContent || existingTextContent;
                // Make sure we have proper spacing before the reply chain
                draftContent.innerHTML = `${formattedDraft}<br>\n<br>\n${existingContent}`;
            } else {
                // No reply chain found, just use the new content
                draftContent.innerHTML = formattedDraft;
            }
            
            // Trigger input event to ensure Gmail registers the change
            draftContent.dispatchEvent(new Event('input', { bubbles: true }));
        }

        console.log('✨ Improved version:', improvedVersion);
    } catch (error) {
        console.error('Error improving draft:', error);
    }
}