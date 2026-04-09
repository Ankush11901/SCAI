import { relations } from "drizzle-orm/relations";
import { users, accounts, generationHistory, quotaUsage, sessions } from "./schema";

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	generationHistories: many(generationHistory),
	quotaUsages: many(quotaUsage),
	sessions: many(sessions),
}));

export const generationHistoryRelations = relations(generationHistory, ({one}) => ({
	user: one(users, {
		fields: [generationHistory.userId],
		references: [users.id]
	}),
}));

export const quotaUsageRelations = relations(quotaUsage, ({one}) => ({
	user: one(users, {
		fields: [quotaUsage.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));