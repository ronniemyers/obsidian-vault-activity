import { App, Notice, TFile, normalizePath } from 'obsidian';
import { NoteActivity } from './types';
import { generateMarkdownReport } from './utils';

export class ReportGenerator {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	async generateReport(activities: NoteActivity[]) {
		if (activities.length === 0) {
			new Notice('No activity data to generate report');
			return;
		}

		const mostAccessed = [...activities].sort((a, b) => b.accessCount - a.accessCount);
		const leastAccessed = [...activities].sort((a, b) => a.accessCount - b.accessCount);
		const totalAccesses = activities.reduce((sum, a) => sum + a.accessCount, 0);

		const report = generateMarkdownReport(
			mostAccessed,
			leastAccessed,
			activities.length,
			totalAccesses
		);

		const timestamp = new Date().toISOString().slice(0, 10);
		const filename = `Vault Activity Report ${timestamp}.md`;
		const filepath = normalizePath(filename);

		try {
			await this.app.vault.create(filepath, report);
			new Notice(`Report generated: ${filename}`);
			
			const file = this.app.vault.getAbstractFileByPath(filepath);
			if (file instanceof TFile) {
				await this.app.workspace.getLeaf().openFile(file);
			}
		} catch (error) {
			console.error('Failed to generate report:', error);
			new Notice('Failed to generate report');
		}
	}
}

