chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, {action: "analyze"});
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getUserInfo") {
        chrome.identity.getProfileUserInfo((userInfo) => {
            sendResponse({ userInfo });
        });
        return true;
    }
}); 