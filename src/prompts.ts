import * as vscode from 'vscode';
import { validateFileName } from './image';

export interface ImageInfo {
	fileName: string;
	altText: string;
}

/**
 * Asks the user for the image file name (without extension) and alt text.
 * The first line of the selected text is used as the default file name.
 * Returns `undefined` when the user cancels either prompt.
 */
export async function promptImageInfo(selectedText: string): Promise<ImageInfo | undefined> {
	const defaultName = selectedText.split(/\r?\n/)[0].trim();

	const fileName = await vscode.window.showInputBox({
		title: 'Paste Image (1/2)',
		prompt: 'Image file name (without extension)',
		placeHolder: 'image',
		value: defaultName,
		validateInput: validateFileName,
	});
	if (fileName === undefined) {
		return undefined;
	}

	const altText = await vscode.window.showInputBox({
		title: 'Paste Image (2/2)',
		prompt: 'Alt text',
		value: defaultName,
	});
	if (altText === undefined) {
		return undefined;
	}

	return { fileName: fileName.trim() || 'image', altText };
}
