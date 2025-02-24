// Listen for clicks on the extension icon
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyze") {
        try {
            console.log("HIT");
            improveDraft().catch(error => {
                console.error('Error in improveDraft:', error);
            });
        } catch (error) {
            console.error('Error handling extension message:', error);
        }
    }
});

async function improveDraft() {
    try {
        console.log('Starting improveDraft...');
        
        // Detect email client
        const isGmail = window.location.hostname.includes('mail.google.com');
        const isOutlook = window.location.hostname.includes('outlook.live.com') || 
                         window.location.hostname.includes('outlook.office.com');
                         
        console.log('Environment detection:', { isGmail, isOutlook, hostname: window.location.hostname });

        if (!isGmail && !isOutlook) {
            throw new Error('Unsupported email client');
        }

        // Initialize variables with appropriate selectors
        const selectors = {
            gmail: {
                subject: 'input[name="subjectbox"]',
                body: 'div[aria-label="Message Body"]',
                recipient: 'span[email]'
            },
            outlook: {
                subject: 'input[aria-label="Add a subject"]',
                body: [
                    '.dFCbN.dPKNh.z8tsM.DziEn',
                    '.dFCbN.fGO0P.dPKNh.DziEn',
                    '.dFCbN.tJ1L7.z8tsM.DziEn',
                    '[role="textbox"][aria-label="Message body"]'
                ],
                recipient: '[data-displayed-name], .textContainer-348, .pU1YL'
            }
        };

        const currentSelectors = isGmail ? selectors.gmail : selectors.outlook;
        console.log('Using selectors:', currentSelectors);

        // Get elements using appropriate selectors
        const subjectInput = document.querySelector(currentSelectors.subject);
        let draftContent;
        
        if (isOutlook) {
            for (const selector of currentSelectors.body) {
                draftContent = document.querySelector(selector);
                if (draftContent) {
                    console.log('Found draft content with selector:', selector);
                    break;
                }
            }
        } else {
            draftContent = document.querySelector(currentSelectors.body);
        }
        
        const recipientElement = document.querySelector(currentSelectors.recipient);

        console.log('Found elements:', {
            subject: !!subjectInput,
            draft: !!draftContent,
            recipient: !!recipientElement,
            draftContentTag: draftContent?.tagName,
            draftContentRole: draftContent?.getAttribute('role'),
            draftContentClasses: draftContent?.className
        });

        if (!draftContent) {
            throw new Error('No draft content element found');
        }

        let recipient = '[Recipient Name]';
        if (recipientElement) {
            try {
                if (isGmail) {
                    const displayName = recipientElement.textContent.trim();
                    recipient = displayName ? displayName.split(' ')[0] : 
                              recipientElement.getAttribute('email')?.split('@')[0] || '[Recipient Name]';
                } else {
                    const displayName = recipientElement.getAttribute('data-displayed-name') || 
                                      recipientElement.textContent.trim();
                    recipient = displayName ? displayName.split(' ')[0] : '[Recipient Name]';
                }
                console.log('Parsed recipient:', recipient);
            } catch (error) {
                console.warn('Error parsing recipient:', error);
            }
        }

        // Get content
        let text;
        let proofElement;
        
        if (isOutlook) {
            proofElement = draftContent.querySelector('.elementToProof');
            text = proofElement ? proofElement.innerText : draftContent.innerText;
        } else {
            text = draftContent.innerText;
        }

        if (!text) {
            throw new Error('No content found in draft');
        }

        console.log('Content found:', {
            textLength: text?.length,
            hasProofElement: !!proofElement
        });

        // Regex patterns for email header matching
        const headerPatterns = [
            // Outlook patterns
            /<div id="divRplyFwdMsg"[^>]*>/i,
            /<div style="border-top:.*?From:/i,
            /\n\nFrom:.*?\nSent:.*?\nTo:.*?\nSubject:/s,
            /<div class="ms-font-weight-regular">From:/i,
            /<font.*?><b>From:<\/b>/i,
            // Gmail patterns
            /<div dir="ltr" class="gmail_attr">On (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} at \d{1,2}:\d{2}(?: [AP]M)?, .+? &lt;.+?&gt; wrote:<\/div>/,
            /On (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} at \d{1,2}:\d{2}(?: [AP]M)?, .+? (?:<[^>]+>|&lt;.+?&gt;) wrote:/,
            /<div dir="ltr" class="gmail_attr">---------- Forwarded message ---------<\/div>/,
            /\n\n---------- Forwarded message ---------/,
            /<div class="x_gmail_quote"/i,
            /class="x_gmail_attr"/i,
            // Generic patterns
            /blockquote class="x_gmail_quote"/i,
            /<div class="gmail_quote"/i
        ];

        let existingContent = '';
        text = draftContent.innerText;

        try {
            // First try pattern matching
            for (const pattern of headerPatterns) {
                const match = draftContent.innerHTML.match(pattern);
                if (match) {
                    const matchIndex = match.index;
                    existingContent = draftContent.innerHTML.substring(matchIndex);
                    text = draftContent.innerText.substring(0, matchIndex).trim();
                    console.log('Found reply chain with pattern:', pattern);
                    // Found a match, don't continue searching
                    break;
                }
            }

            // Try DOM traversal if no pattern match was found
            if (!existingContent) {
                console.log('No pattern match found, trying DOM traversal');
                const replyMarker = draftContent.querySelector('#divRplyFwdMsg, .x_gmail_quote, blockquote, .gmail_quote');
                if (replyMarker) {
                    // Extract just up to the end of the first reply chain
                    const replyContent = replyMarker.outerHTML;
                    const fullContent = draftContent.innerHTML;
                    const startIndex = fullContent.indexOf(replyContent);
                    let endIndex = startIndex + replyContent.length;

                    // Find the next reply marker after this one
                    const nextMarkerMatch = fullContent.slice(endIndex).match(/<div id="divRplyFwdMsg"|<div class="x_gmail_quote"|<blockquote|<div class="gmail_quote"/i);
                    if (nextMarkerMatch) {
                        endIndex = endIndex + nextMarkerMatch.index;
                    }

                    existingContent = fullContent.substring(startIndex, endIndex);
                    text = draftContent.innerText.substring(0, startIndex).trim();
                    console.log('Found reply chain via DOM traversal');
                }
            }

            console.log('Reply chain extraction:', {
                foundChain: !!existingContent,
                chainLength: existingContent?.length,
                extractedTextLength: text?.length
            });
        } catch (error) {
            console.warn('Error parsing existing content:', error);
        }

        const subject = subjectInput ? subjectInput.value : '';
        
        console.log('Preparing API request for:', {
            subject: subject,
            bodyLength: text?.length,
            hasExistingContent: !!existingContent
        });

        // Make API request
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

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid API response format');
        }

        const improvedVersion = data.candidates[0].content.parts[0].text;
        
        // Parse the improved version
        const [improvedSubject, improvedBody, improvedSignature] = improvedVersion.split('---').map(s => s.trim());
        
        // Update the email fields
        if (subjectInput && improvedSubject.startsWith('SUBJECT:')) {
            try {
                const newSubject = improvedSubject.replace('SUBJECT:', '').trim();
                subjectInput.value = newSubject;
                subjectInput.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('Subject updated');
            } catch (error) {
                console.error('Error updating subject:', error);
            }
        }
        
        if (draftContent) {
            try {
                // Clean and format the content
                const contentParts = [];
                if (improvedBody) contentParts.push(improvedBody);
                if (improvedSignature && improvedSignature !== 'undefined') contentParts.push(improvedSignature);
                
                let cleanContent = contentParts.join('\n\n').trim();
                cleanContent = cleanContent
                    .replace(/\n{3,}/g, '\n\n')
                    .split('\n')
                    .map(line => line.trim())
                    .join('\n');

                if (isOutlook) {
                    // First clean up any existing content
                    draftContent.innerHTML = '';
                    
                    // Create or update elementToProof
                    const newProofElement = document.createElement('div');
                    newProofElement.className = 'elementToProof';
                    newProofElement.style.fontFamily = 'Aptos, Aptos_EmbeddedFont, Aptos_MSFontService, Calibri, Helvetica, sans-serif';
                    newProofElement.style.fontSize = '10pt';
                    newProofElement.style.color = 'rgb(0, 0, 0)';
                    newProofElement.innerHTML = cleanContent.split('\n').map(line => {
                        return line.trim() ? `<div>${line}</div>` : '<div><br></div>';
                    }).join('');
                    
                    draftContent.appendChild(newProofElement);
                } else {
                    // Gmail format
                    const formattedContent = cleanContent.split('\n').map(line => {
                        return line.trim() ? `<div>${line}</div>` : '<div><br></div>';
                    }).join('');
                    draftContent.innerHTML = formattedContent;
                }

                // Handle reply chain if it exists
                if (existingContent) {
                    // Add spacing before reply chain
                    draftContent.appendChild(document.createElement('br'));
                    draftContent.appendChild(document.createElement('br'));
                    
                    // Simply append the existing content
                    const replyContentWrapper = document.createElement('div');
                    replyContentWrapper.innerHTML = existingContent;
                    draftContent.appendChild(replyContentWrapper);
                }
                
                // Ensure changes are registered
                draftContent.dispatchEvent(new Event('input', { bubbles: true }));
                if (isOutlook) {
                    draftContent.dispatchEvent(new Event('change', { bubbles: true }));
                    // Focus and blur to ensure Outlook saves the changes
                    draftContent.focus();
                    setTimeout(() => {
                        draftContent.blur();
                    }, 100);
                }
                
                console.log('Draft content updated');
            } catch (error) {
                console.error('Error updating draft content:', error);
            }
        }

        console.log('✨ Improvement complete');
    } catch (error) {
        console.error('Error in improveDraft:', error);
        throw error;
    }
}