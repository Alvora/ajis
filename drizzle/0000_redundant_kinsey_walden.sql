CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"association_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "archived_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_report_id" integer,
	"maraude_name" text,
	"team_name" text,
	"date" text,
	"content" text,
	"author" text,
	"people_helped" integer,
	"archived_at" timestamp DEFAULT now(),
	"association_id" integer
);
--> statement-breakpoint
CREATE TABLE "associations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"color" text,
	"is_admin" integer DEFAULT 0,
	"can_manage_maraudes" integer DEFAULT 1,
	CONSTRAINT "associations_name_unique" UNIQUE("name"),
	CONSTRAINT "associations_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"created_at" timestamp DEFAULT now(),
	"association_id" integer
);
--> statement-breakpoint
CREATE TABLE "circuits" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"path_data" text,
	"color" text,
	"team_assigned" text,
	"created_by" integer,
	"association_id" integer,
	"path_type" text DEFAULT 'line'
);
--> statement-breakpoint
CREATE TABLE "distribution_beneficiaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"distribution_id" integer,
	"beneficiary_id" integer,
	"comment" text,
	"direct_help" boolean DEFAULT false,
	"mobile_meal" boolean DEFAULT false,
	"mobile_meal_type" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"timestamp" timestamp DEFAULT now(),
	"people_helped" integer DEFAULT 1,
	"maraude_team_id" integer,
	"status" text DEFAULT 'completed',
	"mobile_meals_delivered" integer
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "group_page_rights" (
	"group_id" integer,
	"page_name" text,
	"right_level" text,
	CONSTRAINT "group_page_rights_group_id_page_name_pk" PRIMARY KEY("group_id","page_name")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"description" text,
	CONSTRAINT "groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "maraude_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'planned',
	"association_id" integer,
	"prep_location" text,
	"prep_time" text,
	"start_location" text,
	"start_time" text,
	"prep_lat" double precision,
	"prep_lng" double precision,
	"start_lat" double precision,
	"start_lng" double precision,
	"prep_description" text,
	"info_document_url" text,
	"meals_prepared" integer,
	"meals_description" text
);
--> statement-breakpoint
CREATE TABLE "maraude_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer,
	"team_name" text,
	"path_data" text,
	"color" text,
	"path_type" text DEFAULT 'line'
);
--> statement-breakpoint
CREATE TABLE "prep_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"maraude_event_id" integer,
	"user_id" integer,
	"date" timestamp DEFAULT now(),
	CONSTRAINT "prep_registrations_maraude_event_id_user_id_unique" UNIQUE("maraude_event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"maraude_team_id" integer,
	"user_id" integer,
	"is_leader" integer DEFAULT 0,
	"date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"maraude_team_id" integer,
	"date" timestamp DEFAULT now(),
	"content" text,
	"author" text,
	"user_id" integer,
	"people_helped" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"category" text DEFAULT 'Lien',
	"association_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_groups" (
	"role_id" integer,
	"group_id" integer,
	CONSTRAINT "role_groups_role_id_group_id_pk" PRIMARY KEY("role_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_name" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit_type" text,
	"unit_value" double precision,
	"category_id" integer,
	"expiry_date" text,
	"box_id" text,
	"status" text DEFAULT 'available',
	"consumed_at" text,
	"maraude_event_id" integer,
	"maraude_team_id" integer,
	"created_at" timestamp DEFAULT now(),
	"association_id" integer
);
--> statement-breakpoint
CREATE TABLE "stock_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"association_id" integer,
	CONSTRAINT "stock_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stock_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" integer,
	"change_amount" integer,
	"type" text,
	"reason" text,
	"maraude_event_id" integer,
	"maraude_team_id" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_thresholds" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer,
	"min_quantity" integer DEFAULT 0,
	CONSTRAINT "stock_thresholds_category_id_unique" UNIQUE("category_id")
);
--> statement-breakpoint
CREATE TABLE "stock_todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"task" text NOT NULL,
	"is_completed" integer DEFAULT 0,
	"priority" text DEFAULT 'medium',
	"due_date" text,
	"created_at" timestamp DEFAULT now(),
	"association_id" integer
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'open',
	"association_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_groups" (
	"user_id" integer,
	"group_id" integer,
	"is_referent" integer DEFAULT 0,
	CONSTRAINT "user_groups_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "user_locations" (
	"user_id" integer,
	"maraude_event_id" integer,
	"team_id" integer,
	"lat" double precision,
	"lng" double precision,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "user_locations_user_id_maraude_event_id_pk" PRIMARY KEY("user_id","maraude_event_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" integer,
	"role_id" integer,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"avatar_url" text,
	"title" text,
	"role" text,
	"status" text DEFAULT 'active',
	"association_id" integer,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archived_reports" ADD CONSTRAINT "archived_reports_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuits" ADD CONSTRAINT "circuits_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_beneficiaries" ADD CONSTRAINT "distribution_beneficiaries_distribution_id_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_beneficiaries" ADD CONSTRAINT "distribution_beneficiaries_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_maraude_team_id_maraude_teams_id_fk" FOREIGN KEY ("maraude_team_id") REFERENCES "public"."maraude_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_page_rights" ADD CONSTRAINT "group_page_rights_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maraude_events" ADD CONSTRAINT "maraude_events_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maraude_teams" ADD CONSTRAINT "maraude_teams_event_id_maraude_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."maraude_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_registrations" ADD CONSTRAINT "prep_registrations_maraude_event_id_maraude_events_id_fk" FOREIGN KEY ("maraude_event_id") REFERENCES "public"."maraude_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prep_registrations" ADD CONSTRAINT "prep_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_maraude_team_id_maraude_teams_id_fk" FOREIGN KEY ("maraude_team_id") REFERENCES "public"."maraude_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_maraude_team_id_maraude_teams_id_fk" FOREIGN KEY ("maraude_team_id") REFERENCES "public"."maraude_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_groups" ADD CONSTRAINT "role_groups_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_groups" ADD CONSTRAINT "role_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_category_id_stock_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."stock_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_maraude_event_id_maraude_events_id_fk" FOREIGN KEY ("maraude_event_id") REFERENCES "public"."maraude_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_maraude_team_id_maraude_teams_id_fk" FOREIGN KEY ("maraude_team_id") REFERENCES "public"."maraude_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_categories" ADD CONSTRAINT "stock_categories_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_maraude_event_id_maraude_events_id_fk" FOREIGN KEY ("maraude_event_id") REFERENCES "public"."maraude_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_maraude_team_id_maraude_teams_id_fk" FOREIGN KEY ("maraude_team_id") REFERENCES "public"."maraude_teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_thresholds" ADD CONSTRAINT "stock_thresholds_category_id_stock_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."stock_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_todos" ADD CONSTRAINT "stock_todos_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_association_id_associations_id_fk" FOREIGN KEY ("association_id") REFERENCES "public"."associations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_maraude_event_id_maraude_events_id_fk" FOREIGN KEY ("maraude_event_id") REFERENCES "public"."maraude_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_team_id_maraude_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."maraude_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;