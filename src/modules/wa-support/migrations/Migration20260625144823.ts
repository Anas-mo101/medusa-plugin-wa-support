import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260625144823 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "whatsapp" drop constraint if exists "whatsapp_name_unique";`);
    this.addSql(`alter table if exists "queue" drop constraint if exists "queue_color_unique";`);
    this.addSql(`alter table if exists "queue" drop constraint if exists "queue_name_unique";`);
    this.addSql(`alter table if exists "contact" drop constraint if exists "contact_number_unique";`);
    this.addSql(`create table if not exists "act" ("id" text not null, "name" text not null, "flow" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "act_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_act_deleted_at" ON "act" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "contact" ("id" text not null, "name" text not null, "number" text not null, "profilePicUrl" text null, "isGroup" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "contact_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_contact_number_unique" ON "contact" ("number") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_deleted_at" ON "contact" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "contact_custom_field" ("id" text not null, "name" text not null, "value" text not null, "contact_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "contact_custom_field_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_custom_field_contact_id" ON "contact_custom_field" ("contact_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_contact_custom_field_deleted_at" ON "contact_custom_field" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "queue" ("id" text not null, "name" text not null, "color" text not null, "greetingMessage" text null, "act_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "queue_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_queue_name_unique" ON "queue" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_queue_color_unique" ON "queue" ("color") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_queue_act_id" ON "queue" ("act_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_queue_deleted_at" ON "queue" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "whatsapp" ("id" text not null, "name" text not null, "session" text null, "qrcode" text null, "status" text null, "battery" text null, "plugged" boolean null, "isDefault" boolean not null default false, "retries" integer not null default 0, "greetingMessage" text null, "farewellMessage" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "whatsapp_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_whatsapp_name_unique" ON "whatsapp" ("name") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_deleted_at" ON "whatsapp" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ticket" ("id" text not null, "status" text check ("status" in ('pending', 'open', 'closed')) not null default 'pending', "lastMessage" text null, "isGroup" boolean not null default false, "unreadMessages" integer null, "isACTDone" boolean not null default false, "lastACTNode" text null, "contact_id" text not null, "whatsapp_id" text null, "queue_id" text null, "user_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ticket_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ticket_contact_id" ON "ticket" ("contact_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ticket_whatsapp_id" ON "ticket" ("whatsapp_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ticket_queue_id" ON "ticket" ("queue_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ticket_deleted_at" ON "ticket" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "message" ("id" text not null, "body" text not null, "ack" integer not null default 0, "read" boolean not null default false, "mediaType" text null, "mediaUrl" text null, "fromMe" boolean not null default false, "isDeleted" boolean not null default false, "metadata" jsonb null, "ticket_id" text not null, "contact_id" text not null, "quoted_msg_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_ticket_id" ON "message" ("ticket_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_contact_id" ON "message" ("contact_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_quoted_msg_id" ON "message" ("quoted_msg_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_message_deleted_at" ON "message" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "queue_whatsapps" ("queue_id" text not null, "whatsapp_id" text not null, constraint "queue_whatsapps_pkey" primary key ("queue_id", "whatsapp_id"));`);

    this.addSql(`create table if not exists "whatsapp_session_key" ("id" text not null, "type" text not null, "key_id" text not null, "data" text not null, "whatsapp_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "whatsapp_session_key_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_session_key_whatsapp_id" ON "whatsapp_session_key" ("whatsapp_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_whatsapp_session_key_deleted_at" ON "whatsapp_session_key" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "contact_custom_field" add constraint "contact_custom_field_contact_id_foreign" foreign key ("contact_id") references "contact" ("id") on update cascade;`);

    this.addSql(`alter table if exists "queue" add constraint "queue_act_id_foreign" foreign key ("act_id") references "act" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "ticket" add constraint "ticket_contact_id_foreign" foreign key ("contact_id") references "contact" ("id") on update cascade;`);
    this.addSql(`alter table if exists "ticket" add constraint "ticket_whatsapp_id_foreign" foreign key ("whatsapp_id") references "whatsapp" ("id") on update cascade on delete set null;`);
    this.addSql(`alter table if exists "ticket" add constraint "ticket_queue_id_foreign" foreign key ("queue_id") references "queue" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "message" add constraint "message_ticket_id_foreign" foreign key ("ticket_id") references "ticket" ("id") on update cascade;`);
    this.addSql(`alter table if exists "message" add constraint "message_contact_id_foreign" foreign key ("contact_id") references "contact" ("id") on update cascade;`);
    this.addSql(`alter table if exists "message" add constraint "message_quoted_msg_id_foreign" foreign key ("quoted_msg_id") references "message" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "queue_whatsapps" add constraint "queue_whatsapps_queue_id_foreign" foreign key ("queue_id") references "queue" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "queue_whatsapps" add constraint "queue_whatsapps_whatsapp_id_foreign" foreign key ("whatsapp_id") references "whatsapp" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "whatsapp_session_key" add constraint "whatsapp_session_key_whatsapp_id_foreign" foreign key ("whatsapp_id") references "whatsapp" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "queue" drop constraint if exists "queue_act_id_foreign";`);

    this.addSql(`alter table if exists "contact_custom_field" drop constraint if exists "contact_custom_field_contact_id_foreign";`);

    this.addSql(`alter table if exists "ticket" drop constraint if exists "ticket_contact_id_foreign";`);

    this.addSql(`alter table if exists "message" drop constraint if exists "message_contact_id_foreign";`);

    this.addSql(`alter table if exists "ticket" drop constraint if exists "ticket_queue_id_foreign";`);

    this.addSql(`alter table if exists "queue_whatsapps" drop constraint if exists "queue_whatsapps_queue_id_foreign";`);

    this.addSql(`alter table if exists "ticket" drop constraint if exists "ticket_whatsapp_id_foreign";`);

    this.addSql(`alter table if exists "queue_whatsapps" drop constraint if exists "queue_whatsapps_whatsapp_id_foreign";`);

    this.addSql(`alter table if exists "whatsapp_session_key" drop constraint if exists "whatsapp_session_key_whatsapp_id_foreign";`);

    this.addSql(`alter table if exists "message" drop constraint if exists "message_ticket_id_foreign";`);

    this.addSql(`alter table if exists "message" drop constraint if exists "message_quoted_msg_id_foreign";`);

    this.addSql(`drop table if exists "act" cascade;`);

    this.addSql(`drop table if exists "contact" cascade;`);

    this.addSql(`drop table if exists "contact_custom_field" cascade;`);

    this.addSql(`drop table if exists "queue" cascade;`);

    this.addSql(`drop table if exists "whatsapp" cascade;`);

    this.addSql(`drop table if exists "ticket" cascade;`);

    this.addSql(`drop table if exists "message" cascade;`);

    this.addSql(`drop table if exists "queue_whatsapps" cascade;`);

    this.addSql(`drop table if exists "whatsapp_session_key" cascade;`);
  }

}
