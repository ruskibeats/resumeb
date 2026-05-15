#!/usr/bin/env osascript
# LinkedIn Profile Editor - Headline Update
# 
# Uses AppleScript + JavaScript injection to control Google Chrome
# and update the LinkedIn profile headline.
#
# Usage: osascript linkedin-headline-update.applescript "<new headline>"
# Example: osascript linkedin-headline-update.applescript "Operational Transformation Manager — AI"

on run argv
    set newHeadline to item 1 of argv
    
    tell application "Google Chrome"
        activate
        
        # Step 1: Navigate to profile edit page
        tell front window
            set URL of active tab to "https://www.linkedin.com/in/russellbatchelor/edit/intro/"
        end tell
        
        delay 3
        
        # Step 2: Find and update the headline field (contenteditable div)
        tell front window
            tell active tab
                set jsResult to execute javascript "
var headlineDiv = document.querySelector('[contenteditable=\"true\"]');
if (headlineDiv) {
    headlineDiv.scrollIntoView({behavior: 'smooth', block: 'center'});
    headlineDiv.focus();
    var range = document.createRange();
    range.selectNodeContents(headlineDiv);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    headlineDiv.innerText = '" & newHeadline & "';
    headlineDiv.dispatchEvent(new Event('input', { bubbles: true }));
    'Headline updated';
} else {
    'ERROR: No contenteditable div found';
}
"
            end tell
        end tell
        
        delay 1
        
        # Step 3: Click Save button
        tell front window
            tell active tab
                set jsResult to execute javascript "
var btns = document.querySelectorAll('button');
var saveBtn = null;
btns.forEach(function(b) {
    if (b.innerText.trim() === 'Save') saveBtn = b;
});
if (saveBtn) {
    saveBtn.scrollIntoView({behavior: 'smooth', block: 'center'});
    setTimeout(function() { saveBtn.click(); }, 500);
    'Save button clicked';
} else {
    'ERROR: No Save button found';
}
"
            end tell
        end tell
        
        return "LinkedIn headline updated to: " & newHeadline
    end tell
end run
