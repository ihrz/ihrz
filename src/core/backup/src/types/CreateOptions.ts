export interface CreateOptions {
	backupID?: string | null;
	maxMessagesPerChannel?: number | null;
	jsonSave?: boolean | null;
	jsonBeautify?: boolean | null;
	doNotBackup?: string[] | null;
	backupMembers?: boolean | null;
	saveImages?: boolean | null;
}
