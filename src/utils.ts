import { NoteActivity } from './types';

export function formatRelativeTime(timestamp: number): string {
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	
	if (diffMins < 1) {
		return 'Just now';
	} else if (diffMins < 60) {
		return `${diffMins}m ago`;
	} else if (diffHours < 24) {
		return `${diffHours}h ago`;
	} else if (diffDays === 1) {
		return 'Yesterday';
	} else if (diffDays < 7) {
		return `${diffDays} days ago`;
	} else if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
	} else if (diffDays < 365) {
		const months = Math.floor(diffDays / 30);
		return `${months} month${months > 1 ? 's' : ''} ago`;
	} else {
		return date.toLocaleDateString();
	}
}

export function calculateActivityScore(
	activity: NoteActivity, 
	decayWindow: number = 30
): number {
	const now = Date.now();
	const dayMs = 24 * 60 * 60 * 1000;
	
	let score = activity.accessCount;
	
	if (activity.lastAccessed) {
		const daysSinceAccess = (now - activity.lastAccessed) / dayMs;
		const decayFactor = Math.max(0, 1 - (daysSinceAccess / decayWindow));
		score *= (0.5 + 0.5 * decayFactor);
	}
	
	return score;
}

export function getActivityStatus(activity: NoteActivity): {
	status: 'very-active' | 'active' | 'moderate' | 'low' | 'neglected';
	color: string;
} {
	const now = Date.now();
	const dayAgo = now - (24 * 60 * 60 * 1000);
	const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
	const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
	
	if (activity.lastAccessed) {
		if (activity.lastAccessed > dayAgo && activity.accessCount >= 5) {
			return { status: 'very-active', color: '#00ff00' };
		} else if (activity.lastAccessed > weekAgo) {
			return { status: 'active', color: '#88ff88' };
		} else if (activity.lastAccessed > monthAgo) {
			return { status: 'moderate', color: '#ffff88' };
		} else if (activity.accessCount < 3) {
			return { status: 'neglected', color: '#ff8888' };
		}
	}
	
	return { status: 'low', color: '#ffaa88' };
}

export function exportToCSV(activities: NoteActivity[]): string {
	const headers = ['Path', 'Access Count', 'Last Accessed', 'Last Modified'];
	const rows = activities.map(a => [
		a.path,
		String(a.accessCount),
		a.lastAccessed ? new Date(a.lastAccessed).toISOString() : '',
		a.lastModified ? new Date(a.lastModified).toISOString() : ''
	]);
	
	const csv = [
		headers.join(','),
		...rows.map(row => row.map(cell => `"${cell}"`).join(','))
	].join('\n');
	
	return csv;
}

export function generateMarkdownReport(
	mostAccessed: NoteActivity[],
	leastAccessed: NoteActivity[],
	totalFiles: number,
	totalAccesses: number
): string {
	const now = new Date().toLocaleDateString();
	
	let report = `# Vault Activity Report\n\n`;
	report += `Generated: ${now}\n\n`;
	report += `## Summary\n\n`;
	report += `- **Total Files Tracked:** ${totalFiles}\n`;
	report += `- **Total Views:** ${totalAccesses}\n`;
	report += `- **Average Views per File:** ${totalFiles > 0 ? (totalAccesses / totalFiles).toFixed(1) : 0}\n\n`;
	
	report += `## Most Viewed Notes\n\n`;
	report += `| Rank | Note | Views | Last Accessed |\n`;
	report += `|------|------|----------|---------------|\n`;
	mostAccessed.slice(0, 10).forEach((activity, idx) => {
		const lastAccessed = activity.lastAccessed 
			? formatRelativeTime(activity.lastAccessed) 
			: 'Never';
		report += `| ${idx + 1} | ${activity.path} | ${activity.accessCount} | ${lastAccessed} |\n`;
	});
	
	report += `\n## Least Viewed Notes\n\n`;
	report += `| Rank | Note | Views | Last Accessed |\n`;
	report += `|------|------|----------|---------------|\n`;
	leastAccessed.slice(0, 10).forEach((activity, idx) => {
		const lastAccessed = activity.lastAccessed 
			? formatRelativeTime(activity.lastAccessed) 
			: 'Never';
		report += `| ${idx + 1} | ${activity.path} | ${activity.accessCount} | ${lastAccessed} |\n`;
	});
	
	return report;
}

