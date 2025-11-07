import { App, Modal, TFile } from 'obsidian';
import { NoteActivity } from '../types';
import VaultActivityPlugin from '../main';

export class ActivityModal extends Modal {
	private plugin: VaultActivityPlugin;
	private title: string;
	private activities: NoteActivity[];

	constructor(app: App, plugin: VaultActivityPlugin, title: string, activities: NoteActivity[]) {
		super(app);
		this.plugin = plugin;
		this.title = title;
		this.activities = activities;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('h2', { text: this.title });

		if (this.activities.length === 0) {
			contentEl.createEl('p', { text: 'No data available yet.' });
			return;
		}

		const container = contentEl.createDiv({ cls: 'vault-activity-list' });

		this.activities.forEach((activity, index) => {
			const itemDiv = container.createDiv({ cls: 'vault-activity-item' });
			
			const rankSpan = itemDiv.createSpan({ cls: 'vault-activity-rank' });
			rankSpan.setText(`${index + 1}. `);
			
			const displayText = this.plugin.settings.showFullPath 
				? activity.path 
				: activity.path.split('/').pop() || activity.path;
			const linkEl = itemDiv.createEl('a', { 
				text: displayText,
				cls: 'vault-activity-link'
			});
		linkEl.addEventListener('click', (e) => {
			e.preventDefault();
			const file = this.app.vault.getAbstractFileByPath(activity.path);
			if (file instanceof TFile) {
				void this.app.workspace.getLeaf().openFile(file);
				this.close();
			}
		});

			const statsDiv = itemDiv.createDiv({ cls: 'vault-activity-stats' });
			
			const accessSpan = statsDiv.createSpan({ cls: 'vault-activity-stat' });
			accessSpan.setText(`${activity.accessCount} view${activity.accessCount !== 1 ? 's' : ''}`);
			
			if (activity.lastAccessed) {
				const lastAccessSpan = statsDiv.createSpan({ cls: 'vault-activity-stat' });
				lastAccessSpan.setText(`Last accessed: ${this.formatDate(activity.lastAccessed)}`);
			}
			
			if (activity.lastModified) {
				const lastModSpan = statsDiv.createSpan({ cls: 'vault-activity-stat' });
				lastModSpan.setText(`Last modified: ${this.formatDate(activity.lastModified)}`);
			}
		});
	}

	private formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) {
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			if (diffHours === 0) {
				const diffMins = Math.floor(diffMs / (1000 * 60));
				return `${diffMins}m ago`;
			}
			return `${diffHours}h ago`;
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString();
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

