import * as path from 'path';
import * as tmp from 'tmp';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { posix } from 'path';
import { CONGIF_FILENAME } from '../constants';
import { upath } from '../core';

export function isValidFile(uri: vscode.Uri) {
  return uri.scheme === 'file';
}

export function isConfigFile(uri: vscode.Uri) {
  const filename = path.basename(uri.fsPath);
  return filename === CONGIF_FILENAME;
}

export function fileDepth(file: string) {
  return upath.normalize(file).split('/').length;
}

export function makeTmpFile(option): Promise<string> {
  return new Promise((resolve, reject) => {
    tmp.file({ ...option, discardDescriptor: true }, (err, tmpPath) => {
      if (err) reject(err);

      resolve(tmpPath);
    });
  });
}

export class FileStat implements vscode.FileStat {

	constructor(private fsStat: fs.Stats) { }

	get type(): vscode.FileType {
		return this.fsStat.isFile() ? vscode.FileType.File 
        : this.fsStat.isDirectory() ? vscode.FileType.Directory
        : this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
	}

	get isFile(): boolean | undefined {
		return this.fsStat.isFile();
	}

	get isDirectory(): boolean | undefined {
		return this.fsStat.isDirectory();
	}

	get isSymbolicLink(): boolean | undefined {
		return this.fsStat.isSymbolicLink();
	}

	get size(): number {
		return this.fsStat.size;
	}

	get ctime(): number {
		return this.fsStat.ctime.getTime();
	}

	get mtime(): number {
		return this.fsStat.mtime.getTime();
	}
}

export function stat(uri: vscode.Uri) : FileStat {
	return new FileStat(fs.statSync(uri.fsPath));
}

export function dirname(path: string): string {
	return posix.dirname(path);
}