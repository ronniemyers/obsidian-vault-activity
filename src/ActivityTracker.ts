import { TFile, App, Notice } from 'obsidian';
import { ActivityDatabase, NoteActivity, VaultActivitySettings } from './types';

export class ActivityTracker {
	private app: App;
	private settings: VaultActivitySettings;
	public activityData: ActivityDatabase = {};
	private dataFilePath: string;
	private saveCallback: () => void;
	private refreshCallback: () => void;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private refreshTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(
		app: App, 
		settings: VaultActivitySettings, 
		dataFilePath: string,
		saveCallback: () => void,
		refreshCallback: () => void
	) {
		this.app = app;
		this.settings = settings;
		this.dataFilePath = dataFilePath;
		this.saveCallback = saveCallback;
		this.refreshCallback = refreshCallback;
	}

	updateSettings(settings: VaultActivitySettings) {
		this.settings = settings;
	}

	trackAccess(file: TFile) {
		if (!this.settings.trackAccess) return;
		if (this.isExcluded(file.path)) return;

		const now = Date.now();
		if (!this.activityData[file.path]) {
			this.activityData[file.path] = {
				path: file.path,
				accessCount: 0,
				lastAccessed: null,
				lastModified: null
			};
		}

		this.activityData[file.path].accessCount++;
		this.activityData[file.path].lastAccessed = now;

		this.debounceSave();
		this.debounceRefresh();
	}

	trackModification(file: TFile) {
		if (!this.settings.trackModification) return;
		if (this.isExcluded(file.path)) return;

		const now = Date.now();
		if (!this.activityData[file.path]) {
			this.activityData[file.path] = {
				path: file.path,
				accessCount: 0,
				lastAccessed: null,
				lastModified: null
			};
		}

		this.activityData[file.path].lastModified = now;

		this.debounceSave();
		this.debounceRefresh();
	}

	isExcluded(path: string): boolean {
		const configDir = this.app.vault.configDir;
		if (path.startsWith(configDir + '/') || path === configDir) {
			return true;
		}
		
		return this.settings.excludedFolders.some(folder => 
			path.startsWith(folder + '/') || path === folder
		);
	}

	getFilteredActivities(): NoteActivity[] {
		return Object.values(this.activityData).filter(activity => 
			!this.isExcluded(activity.path)
		);
	}

	getSortedByAccess(ascending: boolean): NoteActivity[] {
		const entries = this.getFilteredActivities();
		return entries.sort((a, b) => {
			const diff = a.accessCount - b.accessCount;
			return ascending ? diff : -diff;
		});
	}

	async openRandomNeglected(app: App) {
		const sorted = this.getSortedByAccess(true);
		
		if (sorted.length === 0) {
			new Notice('No activity data available yet');
			return;
		}

		const neglectedCount = Math.max(10, Math.floor(sorted.length * 0.25));
		const neglected = sorted.slice(0, neglectedCount);
		const randomNote = neglected[Math.floor(Math.random() * neglected.length)];
		
		const file = app.vault.getAbstractFileByPath(randomNote.path);
		if (file instanceof TFile) {
			await app.workspace.getLeaf().openFile(file);
			new Notice(`Opened neglected note: ${file.basename}`);
		} else {
			new Notice('Note no longer exists: ' + randomNote.path);
		}
	}

	async loadData() {
		try {
			const adapter = this.app.vault.adapter;
			if (await adapter.exists(this.dataFilePath)) {
				const data = await adapter.read(this.dataFilePath);
				this.activityData = JSON.parse(data) as ActivityDatabase;
			}
		} catch (error) {
			console.error('Failed to load activity data:', error);
			new Notice('Failed to load activity data');
		}
	}

	async saveData() {
		try {
			const adapter = this.app.vault.adapter;
			await adapter.write(this.dataFilePath, JSON.stringify(this.activityData, null, 2));
		} catch (error) {
			console.error('Failed to save activity data:', error);
		}
	}

	async clearData() {
		this.activityData = {};
		await this.saveData();
		new Notice('Activity data cleared');
	}

	private debounceSave() {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
		this.saveTimeout = setTimeout(() => {
			this.saveCallback();
		}, 2000);
	}

	private debounceRefresh() {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			this.refreshCallback();
		}, 1000);
	}
}

