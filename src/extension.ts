import * as vscode from 'vscode';
import { parseImageDataUrl, toMarkdownImage } from './image';
import { EXTENSION_NAME, log, logError } from './logger';
import { readClipboardImage } from './pastePanel';
import { ImagePasteProvider } from './pasteProvider';
import { promptImageInfo } from './prompts';
import { findAvailableFile, getImageDir } from './settings';

export function activate(context: vscode.ExtensionContext) {
	log('activated');
	context.subscriptions.push(
		ImagePasteProvider.register(),
		vscode.commands.registerCommand(`${EXTENSION_NAME}.paste-image`, () =>
			pasteImage(context.extensionUri).catch((error: unknown) => {
				const message = error instanceof Error ? error.message : String(error);
				logError(message);
				vscode.window.showErrorMessage(`Paste Image failed: ${message}`);
			}),
		),
	);
}

export function deactivate() { }

async function pasteImage(extensionUri: vscode.Uri): Promise<void> {
	if (vscode.env.remoteName === undefined) {
		vscode.window.showWarningMessage('Paste Image for Remote only works in a remote environment.');
		return;
	}
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showInformationMessage('No editor is active.');
		return;
	}
	const document = editor.document;

	const info = await promptImageInfo(document.getText(editor.selection));
	if (!info) {
		return;
	}

	const dataUrl = await readClipboardImage(extensionUri);
	if (dataUrl === undefined) {
		return;
	}
	const image = parseImageDataUrl(dataUrl);
	if (!image) {
		vscode.window.showErrorMessage('The clipboard does not contain an image.');
		return;
	}

	const imageDir = getImageDir(document);
	const imageFile = await findAvailableFile(imageDir, info.fileName, image.extension);

	await vscode.workspace.fs.createDirectory(vscode.Uri.file(imageDir));
	await vscode.workspace.fs.writeFile(vscode.Uri.file(imageFile), image.buffer);
	log(`saved ${imageFile}`);

	const target = await vscode.window.showTextDocument(document, { preview: false, viewColumn: editor.viewColumn });
	const markdown = toMarkdownImage(document.uri.fsPath, imageFile, info.altText);
	await target.edit((builder) => builder.replace(target.selection, markdown));
}
