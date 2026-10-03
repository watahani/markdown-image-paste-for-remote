export const EXTENSION_NAME = 'markdown-paste-image-for-remote';

function format(message: string): string {
	return `${new Date().toISOString()} - [${EXTENSION_NAME}] ${message}`;
}

export function log(message: string): void {
	console.log(format(message));
}

export function logError(message: string): void {
	console.error(format(message));
}
