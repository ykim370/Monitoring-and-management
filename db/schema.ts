import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const marketCache=sqliteTable('market_cache',{
 key:text('key').primaryKey(),ticker:text('ticker').notNull(),kind:text('kind').notNull(),
 payload:text('payload'),expires:integer('expires').notNull().default(0),
 attemptedAt:text('attempted_at'),succeededAt:text('succeeded_at'),errorCode:text('error_code'),errorMessage:text('error_message'),
});
export const marketSessions=sqliteTable('market_sessions',{date:text('date').primaryKey(),observedAt:text('observed_at').notNull(),snapshot:text('snapshot').notNull()});
export const userRecords=sqliteTable('user_records',{userId:text('user_id').notNull(),kind:text('kind').notNull(),id:text('id').notNull(),revision:integer('revision').notNull(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.userId,t.kind,t.id]})]);
export const alertState=sqliteTable('alert_state',{userId:text('user_id').notNull(),ruleId:text('rule_id').notNull(),active:integer('active').notNull().default(0),lastFired:integer('last_fired').notNull().default(0)},t=>[primaryKey({columns:[t.userId,t.ruleId]})]);
export const alertEvents=sqliteTable('alert_events',{id:text('id').primaryKey(),userId:text('user_id').notNull(),ruleId:text('rule_id').notNull(),ticker:text('ticker').notNull(),message:text('message').notNull(),createdAt:text('created_at').notNull()},t=>[index('alert_events_user_created').on(t.userId,t.createdAt)]);
export const providerCalls=sqliteTable('provider_calls',{id:text('id').primaryKey(),key:text('key').notNull(),startedAt:integer('started_at').notNull()},t=>[index('provider_calls_started').on(t.startedAt)]);
export const providerJobs=sqliteTable('provider_jobs',{key:text('key').primaryKey(),token:text('token').notNull(),leaseUntil:integer('lease_until').notNull(),retryUntil:integer('retry_until').notNull().default(0),failures:integer('failures').notNull().default(0)});
export const providerControl=sqliteTable('provider_control',{id:integer('id').primaryKey(),cooldownUntil:integer('cooldown_until').notNull().default(0)});
