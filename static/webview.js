// @ts-check
(function () {
    // @ts-ignore acquireVsCodeApi is injected by VS Code
    const vscode = acquireVsCodeApi();

    const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];

    const pasteButton = /** @type {HTMLButtonElement} */ (document.getElementById('paste-button'));
    const statusElement = /** @type {HTMLElement} */ (document.getElementById('status'));
    const logElement = /** @type {HTMLElement} */ (document.getElementById('log'));
    const shortcutElement = /** @type {HTMLElement} */ (document.getElementById('shortcut'));

    if (/Mac|iPhone|iPad/.test(navigator.platform)) {
        shortcutElement.textContent = '⌘V';
    }

    /** @param {string} message */
    function log(message) {
        logElement.textContent += `${new Date().toISOString()}  ${message}\n`;
        vscode.postMessage({ type: 'log', data: message });
    }

    /**
     * @param {string} message
     * @param {'info' | 'error'} [kind]
     */
    function setStatus(message, kind = 'info') {
        statusElement.textContent = message;
        statusElement.dataset.kind = kind;
    }

    /** @param {string} message */
    function fail(message) {
        setStatus(message, 'error');
        pasteButton.disabled = false;
        vscode.postMessage({ type: 'error', data: message });
    }

    /**
     * @param {Blob} blob
     * @returns {Promise<string>}
     */
    function toDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(/** @type {string} */ (reader.result));
            reader.onerror = () => reject(new Error('Failed to read the image.'));
            reader.readAsDataURL(blob);
        });
    }

    /** @param {Blob} blob */
    async function sendImage(blob) {
        log(`sending ${blob.type} (${blob.size} bytes)`);
        setStatus('Saving image…');
        vscode.postMessage({ type: 'image', data: await toDataUrl(blob) });
    }

    /** @returns {Promise<Blob | null>} */
    async function readFromClipboardApi() {
        if (!navigator.clipboard || !navigator.clipboard.read) {
            throw new Error('The clipboard API is not available in this WebView. Try pressing Ctrl+V instead.');
        }
        for (const item of await navigator.clipboard.read()) {
            const type = item.types.find((t) => IMAGE_TYPES.includes(t));
            if (type) {
                return item.getType(type);
            }
        }
        return null;
    }

    async function onPasteButtonClick() {
        pasteButton.disabled = true;
        setStatus('Reading clipboard… Allow access if VS Code asks for permission.');
        try {
            const blob = await readFromClipboardApi();
            if (!blob) {
                fail('No image found in the clipboard. Copy an image and try again.');
                return;
            }
            await sendImage(blob);
        } catch (error) {
            fail(`Could not read the clipboard: ${error instanceof Error ? error.message : error}`);
        }
    }

    /** @param {ClipboardEvent} event */
    async function onPaste(event) {
        const files = Array.from(event.clipboardData ? event.clipboardData.files : []);
        const file = files.find((f) => IMAGE_TYPES.includes(f.type));
        event.preventDefault();
        if (!file) {
            fail('No image found in the clipboard. Copy an image and try again.');
            return;
        }
        pasteButton.disabled = true;
        try {
            await sendImage(file);
        } catch (error) {
            fail(error instanceof Error ? error.message : String(error));
        }
    }

    pasteButton.addEventListener('click', onPasteButtonClick);
    document.addEventListener('paste', onPaste);
    log('webview opened');
})();
