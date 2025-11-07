import { App, Modal } from 'obsidian';

export class ConfirmModal extends Modal {
	private message: string;
	private onConfirm: () => void;

	constructor(app: App, message: string, onConfirm: () => void) {
		super(app);
		this.message = message;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('p', { text: this.message });

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		const confirmButton = buttonContainer.createEl('button', { 
			text: 'Clear data',
			cls: 'mod-warning'
		});
		confirmButton.addEventListener('click', () => {
			this.close();
			this.onConfirm();
		});

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

