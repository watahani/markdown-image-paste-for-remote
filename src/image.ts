import * as path from 'path';

export const DEFAULT_IMAGE_PATH = '${currentFileDir}${currentFileNameWithoutExt}';

export interface ImageData {
	/** File extension without the leading dot, e.g. `png`. */
	extension: string;
	buffer: Buffer;
}

const DATA_URL_PATTERN = /^data:image\/([\w.+-]+);base64,(.*)$/s;

/**
 * Parses a base64 encoded image data URL (`data:image/png;base64,...`).
 * Returns `null` when the given string is not an image data URL.
 */
export function parseImageDataUrl(dataUrl: string): ImageData | null {
	const match = DATA_URL_PATTERN.exec(dataUrl);
	if (!match) {
		return null;
	}
	return { extension: extensionForMime(`image/${match[1]}`), buffer: Buffer.from(match[2], 'base64') };
}

/** Returns the file extension for an image MIME type, e.g. `image/svg+xml` -> `svg`. */
export function extensionForMime(mime: string): string {
	const subtype = mime.toLowerCase().replace(/^image\//, '').replace(/[+;].*$/, '');
	return subtype === 'jpeg' ? 'jpg' : subtype;
}

/**
 * Derives an image file name (without extension) from the selected text:
 * the first line, with characters that are not allowed in file names replaced.
 */
export function fileNameFromSelection(selectedText: string): string {
	const name = selectedText.split(/\r?\n/)[0].trim().replace(/[/\\:*?"<>|]+/g, '-');
	return name || 'image';
}

export interface PathVariables {
	/** Absolute path of the Markdown file being edited. */
	markdownFile: string;
	/** Absolute path of the workspace folder that contains the Markdown file. */
	projectRoot: string;
}

/**
 * Expands the `imagePath` setting into an absolute directory path.
 *
 * Supported variables: `${currentFileDir}`, `${currentFileName}`,
 * `${currentFileNameWithoutExt}` and `${projectRoot}`.
 * `${currentFileDir}` and `${projectRoot}` end with a path separator.
 */
export function resolveImageDir(template: string | undefined, vars: PathVariables): string {
	const fileName = path.basename(vars.markdownFile);
	const values: Record<string, string> = {
		currentFileDir: withTrailingSep(path.dirname(vars.markdownFile)),
		currentFileName: fileName,
		currentFileNameWithoutExt: path.parse(fileName).name,
		projectRoot: withTrailingSep(vars.projectRoot),
	};
	const resolved = (template || DEFAULT_IMAGE_PATH).replace(
		/\$\{(\w+)\}/g,
		(whole, name: string) => values[name] ?? whole,
	);
	return path.resolve(path.dirname(vars.markdownFile), resolved);
}

/** Builds the Markdown image syntax for an image relative to the Markdown file. */
export function toMarkdownImage(markdownFile: string, imageFile: string, altText: string): string {
	return `![${altText}](${toMarkdownLink(markdownFile, imageFile)})`;
}

/** Builds the link target of an image relative to the Markdown file. */
export function toMarkdownLink(markdownFile: string, imageFile: string): string {
	let link = path.relative(path.dirname(markdownFile), imageFile).split(path.sep).join('/');
	if (/[\s()<>]/.test(link)) {
		link = `<${link}>`;
	}
	return link;
}

const FORBIDDEN_FILENAME_CHARS = /[/\\:*?"<>|]/;

export function validateFileName(name: string): string | undefined {
	return FORBIDDEN_FILENAME_CHARS.test(name)
		? 'File names cannot contain /, \\, :, *, ?, ", <, >, |.'
		: undefined;
}

function withTrailingSep(dir: string): string {
	return dir.endsWith(path.sep) ? dir : dir + path.sep;
}
