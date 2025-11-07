import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import VaultActivityPlugin from '../main';
import { NoteActivity } from '../types';

export const VIEW_TYPE_ACTIVITY_DASHBOARD = 'vault-activity-dashboard';

export class ActivityDashboardView extends ItemView {
	plugin: VaultActivityPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: VaultActivityPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_ACTIVITY_DASHBOARD;
	}

	getDisplayText(): string {
		return 'Vault activity';
	}

	getIcon(): string {
		return 'bar-chart-2';
	}

	async onOpen() {
		this.renderDashboard();
	}

	async onClose() {
	}

	renderDashboard() {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('vault-activity-dashboard');

		const summarySection = containerEl.createDiv({ cls: 'vault-activity-section' });
		summarySection.createEl('h3', { text: 'Vault activity' });
		
		const summaryGrid = summarySection.createDiv({ cls: 'vault-activity-summary' });
		this.renderSummaryCards(summaryGrid);

		const topSection = containerEl.createDiv({ cls: 'vault-activity-section' });
		topSection.createEl('h3', { text: 'Most viewed' });
		this.renderTopList(topSection, false, 10);

		const bottomSection = containerEl.createDiv({ cls: 'vault-activity-section' });
		bottomSection.createEl('h3', { text: 'Least viewed' });
		this.renderTopList(bottomSection, true, 10);

		const distributionSection = containerEl.createDiv({ cls: 'vault-activity-section' });
		distributionSection.createEl('h3', { text: 'Distribution' });
		this.renderActivityDistribution(distributionSection);
	}

	private renderSummaryCards(container: HTMLElement) {
		const activities = this.plugin.getFilteredActivities();
		
		const totalCard = container.createDiv({ cls: 'vault-activity-card' });
		totalCard.createDiv({ cls: 'vault-activity-card-title', text: 'Files tracked' });
		totalCard.createDiv({ cls: 'vault-activity-card-value', text: String(activities.length) });

		const totalAccesses = activities.reduce((sum, a) => sum + a.accessCount, 0);
		const accessCard = container.createDiv({ cls: 'vault-activity-card' });
		accessCard.createDiv({ cls: 'vault-activity-card-title', text: 'Total views' });
		accessCard.createDiv({ cls: 'vault-activity-card-value', text: String(totalAccesses) });

		const avgAccesses = activities.length > 0 ? (totalAccesses / activities.length).toFixed(1) : '0';
		const avgCard = container.createDiv({ cls: 'vault-activity-card' });
		avgCard.createDiv({ cls: 'vault-activity-card-title', text: 'Average views per file' });
		avgCard.createDiv({ cls: 'vault-activity-card-value', text: avgAccesses });

		const now = Date.now();
		const dayAgo = now - (24 * 60 * 60 * 1000);
		const recentlyActive = activities.filter(a => 
			a.lastAccessed && a.lastAccessed > dayAgo
		).length;
		const recentCard = container.createDiv({ cls: 'vault-activity-card' });
		recentCard.createDiv({ cls: 'vault-activity-card-title', text: 'Active today' });
		recentCard.createDiv({ cls: 'vault-activity-card-value', text: String(recentlyActive) });
		recentCard.createDiv({ cls: 'vault-activity-card-subtitle', text: 'Last 24 hours' });
	}

	private renderTopList(container: HTMLElement, ascending: boolean, limit: number) {
		const activities = this.plugin.getFilteredActivities();
		const sorted = activities.sort((a, b) => {
			const diff = a.accessCount - b.accessCount;
			return ascending ? diff : -diff;
		});

		const list = sorted.slice(0, limit);
		
		if (list.length === 0) {
			container.createDiv({ 
				text: 'No data available yet.',
				cls: 'vault-activity-empty'
			});
			return;
		}

		const listContainer = container.createDiv({ cls: 'vault-activity-list' });
		
		list.forEach((activity, index) => {
			this.renderActivityItem(listContainer, activity, index + 1);
		});
	}

	private renderActivityItem(container: HTMLElement, activity: NoteActivity, rank: number) {
		const itemDiv = container.createDiv({ cls: 'vault-activity-item' });
		
		const rankSpan = itemDiv.createSpan({ cls: 'vault-activity-rank' });
		rankSpan.setText(`${rank}. `);
		
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
			}
		});

		const statsDiv = itemDiv.createDiv({ cls: 'vault-activity-stats' });
		
		const accessSpan = statsDiv.createSpan({ cls: 'vault-activity-stat' });
		accessSpan.setText(`${activity.accessCount} view${activity.accessCount !== 1 ? 's' : ''}`);
		
		if (activity.lastAccessed) {
			const lastAccessSpan = statsDiv.createSpan({ cls: 'vault-activity-stat' });
			lastAccessSpan.setText(`${this.formatDate(activity.lastAccessed)}`);
		}
	}

	private renderActivityDistribution(container: HTMLElement) {
		const activities = this.plugin.getFilteredActivities();
		
		if (activities.length === 0) {
			container.createDiv({ 
				text: 'No data available yet.',
				cls: 'vault-activity-empty'
			});
			return;
		}

		const buckets = [
			{ label: '1 view', min: 1, max: 1, count: 0 },
			{ label: '2-5 views', min: 2, max: 5, count: 0 },
			{ label: '6-10 views', min: 6, max: 10, count: 0 },
			{ label: '11-20 views', min: 11, max: 20, count: 0 },
			{ label: '21-50 views', min: 21, max: 50, count: 0 },
			{ label: '51+ views', min: 51, max: Infinity, count: 0 }
		];

		activities.forEach(activity => {
			for (const bucket of buckets) {
				if (activity.accessCount >= bucket.min && activity.accessCount <= bucket.max) {
					bucket.count++;
					break;
				}
			}
		});

		const maxCount = Math.max(...buckets.map(b => b.count));
		
		const chartContainer = container.createDiv({ cls: 'vault-activity-histogram' });
		
		buckets.forEach(bucket => {
			const barContainer = chartContainer.createDiv({ cls: 'vault-activity-bar-container' });
			
			const label = barContainer.createDiv({ cls: 'vault-activity-bar-label' });
			label.setText(bucket.label);
			
			const barWrapper = barContainer.createDiv({ cls: 'vault-activity-bar-wrapper' });
			const bar = barWrapper.createDiv({ cls: 'vault-activity-bar' });
			const percentage = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
			bar.style.width = `${percentage}%`;
			
			const count = barWrapper.createDiv({ cls: 'vault-activity-bar-count' });
			count.setText(String(bucket.count));
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

	refresh() {
		this.renderDashboard();
	}
}

