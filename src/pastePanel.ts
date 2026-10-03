import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { log, logError } from './logger';

type WebviewMessage =
	| { type: 'image'; data: string }
	| { type: 'log'; data: string }
	| { type: 'error'; data: string };

/**
 * Opens a webview that reads an image from the local clipboard.
 * Resolves with the image as a data URL, or `undefined` if the panel is closed.
 */
export async function readClipboardImage(extensionUri: vscode.Uri): Promise<string | undefined> {
	const mediaRoot = vscode.Uri.joinPath(extensionUri, 'static');
	const panel = vscode.window.createWebviewPanel(
		'markdownImagePaste',
		'Paste Image',
		vscode.ViewColumn.Beside,
		{ enableScripts: true, localResourceRoots: [mediaRoot] },
	);
	panel.webview.html = await renderHtml(panel.webview, mediaRoot);

	return new Promise((resolve) => {
		const disposables: vscode.Disposable[] = [];
		const finish = (result: string | undefined) => {
			disposables.forEach((d) => d.dispose());
			panel.dispose();
			resolve(result);
		};

		disposables.push(
			panel.onDidDispose(() => finish(undefined)),
			panel.webview.onDidReceiveMessage((message: WebviewMessage) => {
				switch (message.type) {
					case 'image':
						finish(message.data);
						break;
					case 'log':
						log(`[webview] ${message.data}`);
						break;
					case 'error':
						logError(`[webview] ${message.data}`);
						break;
				}
			}),
		);
	});
}

async function renderHtml(webview: vscode.Webview, mediaRoot: vscode.Uri): Promise<string> {
	const template = Buffer.from(
		await vscode.workspace.fs.readFile(vscode.Uri.joinPath(mediaRoot, 'webview.html')),
	).toString('utf-8');
	const nonce = crypto.randomBytes(32).toString('base64');
	const resource = (file: string) => webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, file)).toString();

	return template
		.replace(/%%STYLE_SOURCE%%/g, resource('styles.css'))
		.replace(/%%SCRIPT_SOURCE%%/g, resource('webview.js'))
		.replace(/%%CSP_SOURCE%%/g, webview.cspSource)
		.replace(/%%NONCE%%/g, nonce);
}
