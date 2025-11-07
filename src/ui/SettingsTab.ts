import { App, PluginSettingTab, Setting } from 'obsidian';
import VaultActivityPlugin from '../main';
import { ConfirmModal } from './ConfirmModal';

export class VaultActivitySettingTab extends PluginSettingTab {
	plugin: VaultActivityPlugin;

	constructor(app: App, plugin: VaultActivityPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Track file access')
			.setDesc('Track when files are opened')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.trackAccess)
				.onChange(async (value) => {
					this.plugin.settings.trackAccess = value;
					await this.plugin.saveSettings();
					this.plugin.refreshDashboard();
				}));

		new Setting(containerEl)
			.setName('Track file modifications')
			.setDesc('Track when files are modified')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.trackModification)
				.onChange(async (value) => {
					this.plugin.settings.trackModification = value;
					await this.plugin.saveSettings();
					this.plugin.refreshDashboard();
				}));

		new Setting(containerEl)
			.setName('Show full file path')
			.setDesc('Display complete file paths instead of file names')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showFullPath)
				.onChange(async (value) => {
					this.plugin.settings.showFullPath = value;
					await this.plugin.saveSettings();
					this.plugin.refreshDashboard();
				}));

		new Setting(containerEl).setName("Exclusion rules").setHeading();

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('Comma-separated list of folder paths to exclude from tracking (e.g., templates, attachments, archive).')
			.addTextArea(text => text
				.setPlaceholder('Templates, attachments, archive')
				.setValue(this.plugin.settings.excludedFolders.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.excludedFolders = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
					this.plugin.refreshDashboard();
				}));

		new Setting(containerEl).setName("Data management").setHeading();

		const dataLocation = `${this.app.vault.configDir}/plugins/vault-activity/data.json`;
		new Setting(containerEl)
			.setName('Activity data location')
			.setDesc(`Stored in ${dataLocation}`)
			.addButton(button => button
				.setButtonText('Clear all data')
				.setWarning()
				.onClick(() => {
					new ConfirmModal(
						this.app,
						'Are you sure you want to clear all activity data? This cannot be undone.',
						() => {
							void this.plugin.clearActivityData().then(() => {
								this.display();
							});
						}
					).open();
				}));

		const stats = this.getActivityStats();
		containerEl.createDiv({ 
			text: `Tracking ${stats.totalFiles} files with ${stats.totalAccesses} total views`,
			cls: 'setting-item-description'
		});
	}

	private getActivityStats() {
		const data = this.plugin.getFilteredActivities();
		return {
			totalFiles: data.length,
			totalAccesses: data.reduce((sum, activity) => sum + activity.accessCount, 0)
		};
	}
}

