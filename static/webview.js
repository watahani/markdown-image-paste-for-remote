const vscode = acquireVsCodeApi();
function sendDebug(message) {
    vscode.postMessage({
        type: 'debug',
        data: `${message}`,
    });
}
function showError(message) {
    vscode.postMessage({
        type: 'error',
        data: message,
    });
}
function toggleDebug() {
    const debugElement = document.getElementById('debug');
    debugElement.style.display = debugElement.style.display === 'none' ? 'block' : 'none';
}

function debugOutput(message) {
    sendDebug(message);
    const debugElement = document.getElementById('debug');
    const now = new Date();
    const timestamp = now.toISOString();
    debugElement.innerHTML += `${timestamp} - ${message}<br>`;
}

debugOutput("Web View opened");

// https://dirask.com/posts/JavaScript-read-image-from-clipboard-as-Data-URLs-encoded-with-Base64-10Wwaj
var clipboardUtils = new function () {
    var permissions = {
        'image/bmp': true,
        'image/gif': true,
        'image/png': true,
        'image/jpeg': true,
        'image/tiff': true
    };

    function getType(types) {
        for (var j = 0; j < types.length; ++j) {
            var type = types[j];
            if (permissions[type]) {
                return type;
            }
        }
        return null;
    }
    function getItem(items) {
        for (var i = 0; i < items.length; ++i) {
            var item = items[i];
            if (item) {
                var type = getType(item.types);
                if (type) {
                    return item.getType(type);
                }
            }
        }
        return null;
    }
    function loadFile(file, callback) {
        if (window.FileReader) {
            var reader = new FileReader();
            reader.onload = function () {
                callback(reader.result, null);
            };
            reader.onerror = function () {
                callback(null, 'Incorrect file.');
            };
            reader.readAsDataURL(file);
        } else {
            callback(null, 'File api is not supported.');
        }
    }
    this.readImage = function (callback) {
        if (navigator.clipboard) {
            var promise = navigator.clipboard.read();
            promise
                .then(function (items) {
                    var promise = getItem(items);
                    if (promise == null) {
                        debugOutput("clipboard is empty or does not contains image");
                        callback(null, "clipboard is empty or does not contains image");
                        return;
                    }
                    promise
                        .then(function (result) {
                            loadFile(result, callback);
                        })
                        .catch(function (error) {
                            debugOutput("Reading clipboard error on WebView." + error.message);
                            callback(null, "Reading clipboard error on WebView." + error.message);
                        });
                })
                .catch(function (error) {
                    debugOutput('Reading clipboard error on WebView.' + error.message);
                    callback(null, 'Reading clipboard error on WebView.' + error.message);
                });
        } else {
            showError('Clipboard is not supported on WebView')
            callback(null, 'Clipboard is not supported.');
        }
    };
};
function postDataToExtensionHost(data, error) {
    debugOutput("readImage");
    if (error) {
        showError(error);
        return;
    }
    if (data) {
        vscode.postMessage({
            type: 'image',
            data: data,
        });
    }
}

document.getElementById('paste-image').addEventListener('click', () => {
    const text = 'Please allow access to the clipboard. ⬆️';
    const permissionMessage = document.getElementById('permission-message');
    permissionMessage.innerHtml = text;
    clipboardUtils.readImage(postDataToExtensionHost);
});