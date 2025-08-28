export interface MemberData {
	userId: string;
	username: string;
	discriminator: string;
	avatarUrl: string | null;
	joinedTimestamp: number | null;
	roles: string[];
	bot: boolean;
}
