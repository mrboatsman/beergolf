import { mkdirSync } from 'node:fs';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { env } from '$env/dynamic/private';

// Fil-lagring bakom ett smalt interface. Dev kör filsystem (UPLOAD_DIR),
// produktion kör S3 (STORAGE_DRIVER=s3) — S3-drivern implementeras när
// vi går live.
export interface FileStorage {
	put(key: string, data: Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<Uint8Array>;
	remove(key: string): Promise<void>;
}

class FsStorage implements FileStorage {
	private root: string;

	constructor(root: string) {
		this.root = resolve(root);
		mkdirSync(this.root, { recursive: true });
	}

	// Skydda mot path traversal — nycklar får aldrig lämna roten.
	private path(key: string): string {
		const p = normalize(join(this.root, key));
		if (!p.startsWith(this.root + sep)) throw new Error(`Ogiltig lagringsnyckel: ${key}`);
		return p;
	}

	async put(key: string, data: Uint8Array): Promise<void> {
		const p = this.path(key);
		mkdirSync(dirname(p), { recursive: true });
		await writeFile(p, data);
	}

	async get(key: string): Promise<Uint8Array> {
		return readFile(this.path(key));
	}

	async remove(key: string): Promise<void> {
		await unlink(this.path(key)).catch(() => {});
	}
}

class S3Storage implements FileStorage {
	constructor() {
		// TODO: implementeras inför produktion (S3_BUCKET, S3_REGION + AWS-creds,
		// @aws-sdk/client-s3). Interfacet ovan är kontraktet.
		throw new Error('S3-lagring är inte implementerad ännu — använd STORAGE_DRIVER=fs.');
	}
	put(): Promise<void> {
		return Promise.reject(new Error('not implemented'));
	}
	get(): Promise<Uint8Array> {
		return Promise.reject(new Error('not implemented'));
	}
	remove(): Promise<void> {
		return Promise.reject(new Error('not implemented'));
	}
}

export const storage: FileStorage =
	env.STORAGE_DRIVER === 's3' ? new S3Storage() : new FsStorage(env.UPLOAD_DIR ?? './data/uploads');
