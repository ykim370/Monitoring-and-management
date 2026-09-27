import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const marketCache=sqliteTable('market_cache',{
 key:text('key').primaryKey(),ticker:text('ticker').notNull(),kind:text('kind').notNull(),
 payload:text('payload'),expires:integer('expires').notNull().default(0),
 attemptedAt:text('attempted_at'),succeededAt:text('succeeded_at'),errorCode:text('error_code'),errorMessage:text('error_message'),
});
