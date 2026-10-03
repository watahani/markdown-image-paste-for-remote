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
	const subtype = match[1].toLowerCase();
	const extension = subtype === 'jpeg' ? 'jpg' : subtype.replace(/\+.*$/, '');
	return { extension, buffer: Buffer.from(match[2], 'base64') };
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
	let link = path.relative(path.dirname(markdownFile), imageFile).split(path.sep).join('/');
	if (/[\s()<>]/.test(link)) {
		link = `<${link}>`;
	}
	return `![${altText}](${link})`;
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
