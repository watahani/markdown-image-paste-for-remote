import * as assert from 'assert';
import * as path from 'path';
import { extensionForMime, fileNameFromSelection, parseImageDataUrl, resolveImageDir, toMarkdownImage, validateFileName } from '../../image';

suite('image helpers', () => {
	const root = path.resolve('/workspace/project');
	const markdownFile = path.join(root, 'docs', 'guide.md');

	test('parseImageDataUrl', () => {
		const png = parseImageDataUrl('data:image/png;base64,aGVsbG8=');
		assert.strictEqual(png?.extension, 'png');
		assert.strictEqual(png?.buffer.toString(), 'hello');
		assert.strictEqual(parseImageDataUrl('data:image/jpeg;base64,AA==')?.extension, 'jpg');
		assert.strictEqual(parseImageDataUrl('data:text/plain;base64,AA=='), null);
	});

	test('resolveImageDir uses the default template', () => {
		assert.strictEqual(resolveImageDir(undefined, { markdownFile, projectRoot: root }), path.join(root, 'docs', 'guide'));
	});

	test('resolveImageDir expands variables', () => {
		const vars = { markdownFile, projectRoot: root };
		assert.strictEqual(resolveImageDir('${projectRoot}images/${currentFileName}', vars), path.join(root, 'images', 'guide.md'));
		assert.strictEqual(resolveImageDir('assets', vars), path.join(root, 'docs', 'assets'));
	});

	test('toMarkdownImage builds a relative link', () => {
		assert.strictEqual(toMarkdownImage(markdownFile, path.join(root, 'docs', 'guide', 'a.png'), 'alt'), '![alt](guide/a.png)');
		assert.strictEqual(toMarkdownImage(markdownFile, path.join(root, 'img', 'my image.png'), ''), '![](<../img/my image.png>)');
	});

	test('validateFileName', () => {
		assert.strictEqual(validateFileName('screenshot-1'), undefined);
		assert.ok(validateFileName('a/b'));
	});

	test('extensionForMime', () => {
		assert.strictEqual(extensionForMime('image/png'), 'png');
		assert.strictEqual(extensionForMime('image/jpeg'), 'jpg');
		assert.strictEqual(extensionForMime('image/svg+xml'), 'svg');
	});

	test('fileNameFromSelection', () => {
		assert.strictEqual(fileNameFromSelection(''), 'image');
		assert.strictEqual(fileNameFromSelection('  diagram  \nsecond line'), 'diagram');
		assert.strictEqual(fileNameFromSelection('a/b: c'), 'a-b- c');
	});
});
