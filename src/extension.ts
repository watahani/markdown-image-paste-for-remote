// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { StringDecoder } from 'string_decoder';

const EXTENSION_NAME = 'markdown-paste-image-for-remote';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	if (vscode.env.remoteName === undefined) {
		log("this extension only works in remote environment");
		return;
	}
	// Use the console to output diagnostic information (log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	log(`"${EXTENSION_NAME}" is now active!`);

	const staticPath = vscode.Uri.file(path.join(context.extensionPath, 'static'));
	const htmlPath = vscode.Uri.joinPath(staticPath, 'webview.html');
	const decoder = new StringDecoder('utf-8');
	const unit8content = await vscode.workspace.fs.readFile(htmlPath);
	const htmlTemplate = decoder.write(Buffer.from(unit8content));

	context.subscriptions.push(
		vscode.commands.registerCommand(`${EXTENSION_NAME}.paste-image`, async () => {
			//get file which is active
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage('No editor is active');
				return;
			}
			pasteImage(context, staticPath, htmlTemplate);

		})
	);
}

function log(message: string) {
	//utc timestapmp
	const timestamp = new Date().toISOString();
	console.log(`${timestamp} - [${EXTENSION_NAME}]${message}`);
}

function err(message: string) {
	const timestamp = new Date().toISOString();
	console.error(`${timestamp} - [${EXTENSION_NAME}]${message}`);
}

async function pasteImage(context: vscode.ExtensionContext, staticPath: vscode.Uri, htmlTemplate: string) {

	try {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}
		//selected text
		const selectedText = editor.document.getText(editor.selection);
		const fileNameAndAlt = await askFileName(selectedText);
		if (fileNameAndAlt === null) { return; }
		//get relative path
		const mdPath = editor.document.uri.fsPath;	

		const panel = await createImagePastePanel(staticPath, htmlTemplate);
		await panel.webview.onDidReceiveMessage(
			async (message) => {
				if (message.type === 'image') {
					if (checkMessageIsImage(message.data) === false) {
						vscode.window.showErrorMessage('Not an image in clipboard');
						panel.dispose();
					}
					const base64data = message.data.replace(/^data:image\/\w+;base64,/, '');
					const fileExtension = message.data.substring(message.data.indexOf('/') + 1, message.data.indexOf(';'));

					const mdName = mdPath.substring(mdPath.lastIndexOf('/') + 1, mdPath.length);
					const currentFileDir = path.dirname(mdPath) + '/';
					const mdNameWithoutExtension = mdName.substring(0, mdName.lastIndexOf('.'));
					const projectRoot = vscode.workspace.workspaceFolders![0].uri.fsPath + '/';

					let pathConfig = vscode.workspace.getConfiguration('markdownImagePasteForRemote')['imagePath'];
					if (!pathConfig) {
						pathConfig = "${currentFileDir}${currentFileNameWithoutExt}";
					}
					pathConfig = pathConfig.replace(/\${currentFileDir}/g, currentFileDir);
					pathConfig = pathConfig.replace(/\${currentFileName}/g, mdName);
					pathConfig = pathConfig.replace(/\${currentFileNameWithoutExt}/g, mdNameWithoutExtension);
					pathConfig = pathConfig.replace(/\${projectRoot}/g, projectRoot);
			
					const outpath = pathConfig;

					await saveImageToFolder(base64data, outpath, fileNameAndAlt.filename + '.' + fileExtension);
					const relativePath = path.relative(currentFileDir, outpath + '/' + fileNameAndAlt.filename + '.' + fileExtension);
					panel.dispose(); // Close the webview panel
					await insertImageToMarkdown(editor, relativePath, fileNameAndAlt.altText);

				} else if (message.type === 'debug') {
					log(`[webview] ${message.data}`);
				} else if (message.type === 'error') {
					err(`[webview] ${message.data}`);
					vscode.window.showErrorMessage(message.data);
					panel.dispose();
				}
			},
			undefined,
			context.subscriptions
		);
	} catch (error: any) {
		err(error.message);
		vscode.window.showErrorMessage(`Error: ${error.message}`);
	}
}

function checkMessageIsImage(message: string) {
	const regex = /^data:image\/\w+;base64,/;
	return regex.test(message);
}

async function saveImageToFolder(base64data: string, folderPath: string, imageName: string) {
	//if folder not exist create it
	try {
		await vscode.workspace.fs.stat(vscode.Uri.file(folderPath));
	} catch (error) {
		//create 
		log(`Creating folder ${folderPath}`);
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(folderPath));
	}
	const imagePath = path.join(folderPath, imageName);

	const buffer = Buffer.from(base64data, 'base64');
	await vscode.workspace.fs.writeFile(vscode.Uri.file(imagePath), buffer);

	return;
}

async function insertImageToMarkdown(editor: vscode.TextEditor, imagePath: string, altText: string) {
	if (editor) {
		const imageMarkdown = `![${altText}](${imagePath})`;
		// Refocuse the editor
		const focusedEditor = await vscode.window.showTextDocument(editor.document, { preview: false, viewColumn: editor.viewColumn });
		//if selection
		if (focusedEditor.selection.isEmpty) {
			focusedEditor.edit((editBuilder) => {
				editBuilder.insert(focusedEditor.selection.active, imageMarkdown);
			});
		} else {
			focusedEditor.edit((editBuilder) => {
				editBuilder.replace(focusedEditor.selection, imageMarkdown);
			});
		}
	} else {
		vscode.window.showErrorMessage('No active editor found');
	}
}

async function createImagePastePanel(staticPath: vscode.Uri, htmlTemplate: string) {
	const panel = vscode.window.createWebviewPanel(
		'imagePaste',
		'Paste Image',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			localResourceRoots: [staticPath]
		}
	);

	const cssPath = vscode.Uri.joinPath(staticPath, 'styles.css');
	const scriptPath = vscode.Uri.joinPath(staticPath, 'webview.js');
	const nonce = getBase64Nonce();

	panel.webview.html = htmlTemplate.replace('%%STYLE_SOURCE%%', panel.webview.asWebviewUri(cssPath).toString())
		.replace('%%SCRIPT_SOURCE%%', panel.webview.asWebviewUri(scriptPath).toString())
		.replace(/%%CSP_SOURCE%%/g, panel.webview.cspSource)
		.replace(/%%NONCE%%/g, nonce);
	return panel;
}

function getBase64Nonce() {
	const nonce = new Uint8Array(32);
	crypto.randomFillSync(nonce);
	return Buffer.from(nonce).toString('base64');
}

async function askFileName(selectedString?: string): Promise<{ filename: string, altText: string } | null> {
	let value = "";
	if (selectedString) {
		//split by line break
		const lines = selectedString.split(/\r?\n/);
		if (lines.length >= 1) {
			//first line is filename
			value = lines[0];
		}
	};
	const inputFileName = await vscode.window.showInputBox({
		prompt: 'enter file name',
		placeHolder: 'image',
		value: selectedString,
		validateInput: (input: string) => {
            const forbiddenCharacters = /[/\\:*?"<>|]/g;
            return forbiddenCharacters.test(input)
                ? 'File names cannot contain /, \\, :, *, ?, ", <, >, |.'
                : null;
        },
	});

	if (null === inputFileName || undefined === inputFileName) {
		return null;
	}

	let inputAltText = await vscode.window.showInputBox({
		prompt: 'enter alt text'
	});

	if (null === inputAltText || undefined === inputAltText) {
		return null;
	}

	const filename = inputFileName !== '' ? inputFileName : 'image';

	return { filename: filename, altText: inputAltText };
}
