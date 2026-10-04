import * as vscode from 'vscode';
import { extensionForMime, fileNameFromSelection, toMarkdownLink } from './image';
import { log } from './logger';
import { findAvailableFile, getImageDir, isEditorPasteEnabled } from './settings';

/**
 * Handles images pasted into a Markdown editor.
 *
 * VS Code reads the clipboard on the UI side and transfers the image to the
 * extension host on demand, so this also works in Codespaces and remote hosts.
 */
export class ImagePasteProvider implements vscode.DocumentPasteEditProvider {
	static readonly kind = vscode.DocumentDropOrPasteEditKind.Empty.append('markdown', 'link', 'image', 'remote');

	static register(): vscode.Disposable {
		return vscode.languages.registerDocumentPasteEditProvider(
			{ language: 'markdown' },
			new ImagePasteProvider(),
			{ providedPasteEditKinds: [ImagePasteProvider.kind], pasteMimeTypes: ['image/*'] },
		);
	}

	async provideDocumentPasteEdits(
		document: vscode.TextDocument,
		ranges: readonly vscode.Range[],
		dataTransfer: vscode.DataTransfer,
		_context: vscode.DocumentPasteEditContext,
		token: vscode.CancellationToken,
	): Promise<vscode.DocumentPasteEdit[] | undefined> {
		if (!isEditorPasteEnabled(document)) {
			return undefined;
		}
		const image = findImage(dataTransfer);
		if (!image) {
			return undefined;
		}

		const selectedText = ranges.length === 1 ? document.getText(ranges[0]) : '';
		const imageFile = await findAvailableFile(
			getImageDir(document),
			fileNameFromSelection(selectedText),
			extensionForMime(image.mime),
		);
		if (token.isCancellationRequested) {
			return undefined;
		}

		// The image is only read from the clipboard when the edit is applied.
		const additionalEdit = new vscode.WorkspaceEdit();
		additionalEdit.createFile(vscode.Uri.file(imageFile), { contents: image.file });

		// Alt text is a snippet placeholder so it can be typed right after pasting.
		const snippet = new vscode.SnippetString('![')
			.appendPlaceholder(selectedText.split(/\r?\n/)[0].trim() || 'image')
			.appendText(`](${toMarkdownLink(document.uri.fsPath, imageFile)})`);

		const edit = new vscode.DocumentPasteEdit(snippet, 'Insert image (Paste Image for Remote)', ImagePasteProvider.kind);
		edit.additionalEdit = additionalEdit;
		log(`paste: ${image.mime} -> ${imageFile}`);
		return [edit];
	}
}

function findImage(dataTransfer: vscode.DataTransfer): { mime: string; file: vscode.DataTransferFile } | undefined {
	for (const [mime, item] of dataTransfer) {
		const file = item.asFile();
		if (mime.startsWith('image/') && file) {
			return { mime, file };
		}
	}
	return undefined;
}
