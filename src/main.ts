import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { VaultActivitySettings, DEFAULT_SETTINGS } from './types';
import { VaultActivitySettingTab } from './ui/SettingsTab';
import { ActivityModal } from './ui/ActivityModal';
import { ActivityDashboardView, VIEW_TYPE_ACTIVITY_DASHBOARD } from './ui/DashboardView';
import { ActivityTracker } from './ActivityTracker';
import { ReportGenerator } from './ReportGenerator';

export default class VaultActivityPlugin extends Plugin {
	settings!: VaultActivitySettings;
	tracker!: ActivityTracker;
	reportGenerator!: ReportGenerator;
	
	get dataFilePath(): string {
		return `${this.app.vault.configDir}/plugins/vault-activity/data.json`;
	}

	get activityData() {
		return this.tracker.activityData;
	}

	async onload() {
		await this.loadSettings();
		
		this.tracker = new ActivityTracker(
			this.app,
			this.settings,
			this.dataFilePath,
			() => void this.tracker.saveData(),
			() => this.refreshDashboard()
		);
		this.reportGenerator = new ReportGenerator(this.app);
		
		await this.tracker.loadData();

		this.registerView(
			VIEW_TYPE_ACTIVITY_DASHBOARD,
			(leaf) => new ActivityDashboardView(leaf, this)
		);

		this.app.workspace.onLayoutReady(() => {
			void this.initDashboardView();
		});

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file instanceof TFile) {
					this.tracker.trackAccess(file);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile) {
					this.tracker.trackModification(file);
				}
			})
		);

		this.addCommand({
			id: 'show-most-accessed',
			name: 'Show most viewed notes',
			callback: () => this.showMostAccessed()
		});

		this.addCommand({
			id: 'show-least-accessed',
			name: 'Show least viewed notes',
			callback: () => this.showLeastAccessed()
		});

		this.addCommand({
			id: 'open-random-neglected',
			name: 'Open random inactive note',
			callback: () => void this.tracker.openRandomNeglected(this.app)
		});

		this.addCommand({
			id: 'clear-activity-data',
			name: 'Clear all activity data',
			callback: () => void this.clearActivityData()
		});

		this.addCommand({
			id: 'open-dashboard',
			name: 'Open activity dashboard',
			callback: () => void this.activateDashboardView()
		});

		this.addCommand({
			id: 'generate-report',
			name: 'Generate activity report',
			callback: () => void this.generateReport()
		});

		this.addSettingTab(new VaultActivitySettingTab(this.app, this));

		this.registerInterval(
			window.setInterval(() => void this.tracker.saveData(), 5 * 60 * 1000)
		);
	}

	onunload() {
		void this.tracker.saveData();
	}

	private showMostAccessed() {
		const sorted = this.tracker.getSortedByAccess(false);
		new ActivityModal(this.app, this, 'Most viewed notes', sorted.slice(0, 20)).open();
	}

	private showLeastAccessed() {
		const sorted = this.tracker.getSortedByAccess(true);
		new ActivityModal(this.app, this, 'Least viewed notes', sorted.slice(0, 20)).open();
	}

	async clearActivityData() {
		await this.tracker.clearData();
		this.refreshDashboard();
	}

	private async generateReport() {
		await this.reportGenerator.generateReport(this.tracker.getFilteredActivities());
	}

	async initDashboardView() {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY_DASHBOARD);
		
		if (leaves.length === 0) {
			const leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_ACTIVITY_DASHBOARD,
					active: true
				});
			}
		}
	}

	async activateDashboardView() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY_DASHBOARD);
		
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_ACTIVITY_DASHBOARD,
					active: true
				});
			}
		}
		
		if (leaf) {
			void workspace.revealLeaf(leaf);
			const view = leaf.view;
			if (view instanceof ActivityDashboardView && view.refresh) {
				view.refresh();
			}
		}
	}

	refreshDashboard(): void {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ACTIVITY_DASHBOARD);
		leaves.forEach(leaf => {
			const view = leaf.view;
			if (view instanceof ActivityDashboardView && view.refresh) {
				view.refresh();
			}
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.tracker.updateSettings(this.settings);
	}

	async loadSettings() {
		const data = await this.loadData() as VaultActivitySettings | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	isExcluded(path: string): boolean {
		return this.tracker.isExcluded(path);
	}

	getFilteredActivities() {
		return this.tracker.getFilteredActivities();
	}
}
