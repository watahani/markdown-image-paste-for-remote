import * as path from 'path';
import * as vscode from 'vscode';
import { resolveImageDir } from './image';

const SECTION = 'markdownImagePasteForRemote';

/** Resolves the `imagePath` setting into the directory where images for `document` are saved. */
export function getImageDir(document: vscode.TextDocument): string {
	const markdownFile = document.uri.fsPath;
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri) ?? vscode.workspace.workspaceFolders?.[0];
	return resolveImageDir(
		vscode.workspace.getConfiguration(SECTION, document).get<string>('imagePath'),
		{ markdownFile, projectRoot: workspaceFolder?.uri.fsPath ?? path.dirname(markdownFile) },
	);
}

export function isEditorPasteEnabled(document: vscode.TextDocument): boolean {
	return vscode.workspace.getConfiguration(SECTION, document).get<boolean>('editorPaste.enabled', true);
}

/** Returns `<dir>/<name>.<ext>`, adding `-1`, `-2`, ... to the name if the file already exists. */
export async function findAvailableFile(dir: string, name: string, extension: string): Promise<string> {
	for (let i = 0; ; i++) {
		const candidate = path.join(dir, `${i === 0 ? name : `${name}-${i}`}.${extension}`);
		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(candidate));
		} catch {
			return candidate;
		}
	}
}
