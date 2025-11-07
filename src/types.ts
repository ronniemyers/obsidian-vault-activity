export interface NoteActivity {
	path: string;
	accessCount: number;
	lastAccessed: number | null;
	lastModified: number | null;
}

export interface ActivityDatabase {
	[path: string]: NoteActivity;
}

export interface VaultActivitySettings {
	excludedFolders: string[];
	trackAccess: boolean;
	trackModification: boolean;
	showFullPath: boolean;
}

export const DEFAULT_SETTINGS: VaultActivitySettings = {
	excludedFolders: [],
	trackAccess: true,
	trackModification: true,
	showFullPath: true
};

