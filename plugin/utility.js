const dbName = 'Professionalism';
const storeName = 'sessions';

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(storeName, { keyPath: 'id' });
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

async function saveSession(sessionData) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.put(sessionData);
}

async function getSession() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get('currentSession');

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

async function savePersistentUuid(uuid) {
    await saveSession({ id: 'currentSession', persistentUuid: uuid });
}

async function getPersistentUuid() {
    const sessionData = await getSession();
    return sessionData ? sessionData.persistentUuid : null;
}

function extractCallerInfo() {
    const stack = new Error().stack;
    const stackLines = stack.split('\n');
    const callerLine = stackLines[3] || '';
    const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);

    if (match) {
        return {
            functionName: match[1] || 'unknown',
            fileName: match[2] || 'unknown'
        };
    }

    return { functionName: 'unknown', fileName: 'unknown' };
}

async function log(level, message, file, functionName) {
    const sessionData = await getSession();
    const persistentUuid = sessionData ? sessionData.persistentUuid : null;
    const sessionId = sessionStorage.getItem('sessionId') || null;

    const logEntry = {
        level,
        message,
        file,
        function: functionName,
        deviceId: chrome.runtime.id,
        persistentUuid,
        sessionId
    };

    try {
        const response = await fetch(`${config.API_ENDPOINT}/logs/${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(logEntry)
        });

        if (!response.ok) {
            console.error('Failed to log entry:', response.statusText);
        }
    } catch (error) {
        console.error('Error sending log entry:', error);
    }
}

// Helper functions for different log levels
async function logInfo(message) {
    const { functionName, fileName } = extractCallerInfo();
    await log('INFO', message, fileName, functionName);
}

async function logWarn(message) {
    const { functionName, fileName } = extractCallerInfo();
    await log('WARN', message, fileName, functionName);
}

async function logError(message) {
    const { functionName, fileName } = extractCallerInfo();
    await log('ERROR', message, fileName, functionName);
}