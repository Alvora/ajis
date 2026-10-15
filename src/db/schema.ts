import { pgTable, serial, text, integer, timestamp, real, boolean, primaryKey, unique, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  title: text('title'),
  role: text('role'),
  status: text('status').default('active'),
  associationId: integer('association_id'), // Added later in SQLite, adding here
});

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  color: text('color'),
  description: text('description'),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  description: text('description'),
});

export const associations = pgTable('associations', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  email: text('email'),
  color: text('color'),
  isAdmin: integer('is_admin').default(0),
  canManageMaraudes: integer('can_manage_maraudes').default(1),
});

export const maraudeEvents = pgTable('maraude_events', {
  id: serial('id').primaryKey(),
  date: text('date').notNull(),
  status: text('status').default('planned'),
  associationId: integer('association_id').references(() => associations.id, { onDelete: 'cascade' }),
  prepLocation: text('prep_location'),
  prepTime: text('prep_time'),
  startLocation: text('start_location'),
  startTime: text('start_time'),
  prepLat: doublePrecision('prep_lat'),
  prepLng: doublePrecision('prep_lng'),
  startLat: doublePrecision('start_lat'),
  startLng: doublePrecision('start_lng'),
  prepDescription: text('prep_description'),
  infoDocumentUrl: text('info_document_url'),
  mealsPrepared: integer('meals_prepared'),
  mealsDescription: text('meals_description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const maraudeTeams = pgTable('maraude_teams', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => maraudeEvents.id, { onDelete: 'cascade' }),
  teamName: text('team_name'),
  pathData: text('path_data'),
  color: text('color'),
  pathType: text('path_type').default('line'),
});

export const circuits = pgTable('circuits', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  pathData: text('path_data'),
  color: text('color'),
  teamAssigned: text('team_assigned'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  associationId: integer('association_id').references(() => associations.id, { onDelete: 'cascade' }),
  pathType: text('path_type').default('line'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockCategories = pgTable('stock_categories', {
  id: serial('id').primaryKey(),
  name: text('name').unique().notNull(),
  color: text('color'),
  associationId: integer('association_id').references(() => associations.id, { onDelete: 'cascade' }), // Assumption based on context
});

export const stock = pgTable('stock', {
  id: serial('id').primaryKey(),
  itemName: text('item_name').notNull(),
  quantity: integer('quantity').default(1),
  unitType: text('unit_type'),
  unitValue: doublePrecision('unit_value'),
  categoryId: integer('category_id').references(() => stockCategories.id, { onDelete: 'set null' }),
  expiryDate: text('expiry_date'),
  boxId: text('box_id'),
  status: text('status').default('available'),
  consumedAt: text('consumed_at'),
  maraudeEventId: integer('maraude_event_id').references(() => maraudeEvents.id, { onDelete: 'set null' }),
  maraudeTeamId: integer('maraude_team_id').references(() => maraudeTeams.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  associationId: integer('association_id').references(() => associations.id),
});

export const stockHistory = pgTable('stock_history', {
  id: serial('id').primaryKey(),
  stockId: integer('stock_id').references(() => stock.id, { onDelete: 'cascade' }),
  changeAmount: integer('change_amount'),
  type: text('type'),
  reason: text('reason'),
  maraudeEventId: integer('maraude_event_id').references(() => maraudeEvents.id, { onDelete: 'set null' }),
  maraudeTeamId: integer('maraude_team_id').references(() => maraudeTeams.id, { onDelete: 'set null' }),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const roleGroups = pgTable('role_groups', {
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.groupId] }),
}));

export const groupPageRights = pgTable('group_page_rights', {
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
  pageName: text('page_name').notNull(),
  rightLevel: text('right_level'),
}, (t) => ({
  pk: primaryKey({ columns: [t.groupId, t.pageName] }),
}));

export const userRoles = pgTable('user_roles', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: integer('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
}));

export const userGroups = pgTable('user_groups', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  groupId: integer('group_id').references(() => groups.id, { onDelete: 'cascade' }).notNull(),
  isReferent: integer('is_referent').default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.groupId] }),
}));

export const galleryImages = pgTable('gallery_images', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  caption: text('caption'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  category: text('category').default('Lien'),
  associationId: integer('association_id').references(() => associations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorName: text('author_name').notNull(),
  associationId: integer('association_id').references(() => associations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const prepRegistrations = pgTable('prep_registrations', {
  id: serial('id').primaryKey(),
  maraudeEventId: integer('maraude_event_id').references(() => maraudeEvents.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date').defaultNow(),
}, (t) => ({
  unq: unique().on(t.maraudeEventId, t.userId),
}));

export const registrations = pgTable('registrations', {
  id: serial('id').primaryKey(),
  maraudeTeamId: integer('maraude_team_id').references(() => maraudeTeams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  isLeader: integer('is_leader').default(0),
  date: timestamp('date').defaultNow(),
});

export const distributions = pgTable('distributions', {
  id: serial('id').primaryKey(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  timestamp: timestamp('timestamp').defaultNow(),
  peopleHelped: integer('people_helped').default(1),
  maraudeTeamId: integer('maraude_team_id').references(() => maraudeTeams.id, { onDelete: 'cascade' }),
  status: text('status').default('completed'),
  mobileMealsDelivered: integer('mobile_meals_delivered'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  maraudeTeamId: integer('maraude_team_id').references(() => maraudeTeams.id, { onDelete: 'cascade' }),
  date: timestamp('date').defaultNow(),
  content: text('content'),
  author: text('author'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  peopleHelped: integer('people_helped').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const beneficiaries = pgTable('beneficiaries', {
  id: serial('id').primaryKey(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  createdAt: timestamp('created_at').defaultNow(),
  associationId: integer('association_id').references(() => associations.id),
});

export const distributionBeneficiaries = pgTable('distribution_beneficiaries', {
  id: serial('id').primaryKey(),
  distributionId: integer('distribution_id').references(() => distributions.id, { onDelete: 'cascade' }),
  beneficiaryId: integer('beneficiary_id').references(() => beneficiaries.id, { onDelete: 'cascade' }),
  comment: text('comment'),
  directHelp: boolean('direct_help').default(false),
  mobileMeal: boolean('mobile_meal').default(false),
  mobileMealType: text('mobile_meal_type'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userLocations = pgTable('user_locations', {
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  maraudeEventId: integer('maraude_event_id').references(() => maraudeEvents.id, { onDelete: 'cascade' }).notNull(),
  teamId: integer('team_id').references(() => maraudeTeams.id, { onDelete: 'cascade' }),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.maraudeEventId] }),
}));

export const archivedReports = pgTable('archived_reports', {
  id: serial('id').primaryKey(),
  originalReportId: integer('original_report_id'),
  maraudeName: text('maraude_name'),
  teamName: text('team_name'),
  date: text('date'),
  content: text('content'),
  author: text('author'),
  peopleHelped: integer('people_helped'),
  archivedAt: timestamp('archived_at').defaultNow(),
  associationId: integer('association_id').references(() => associations.id), // Added later
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').default('open'),
  associationId: integer('association_id').references(() => associations.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockPartners = pgTable('stock_partners', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type'),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  associationId: integer('association_id').references(() => associations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const stockTodos = pgTable('stock_todos', {
  id: serial('id').primaryKey(),
  task: text('task').notNull(),
  isCompleted: integer('is_completed').default(0),
  priority: text('priority').default('medium'),
  dueDate: text('due_date'),
  createdAt: timestamp('created_at').defaultNow(),
  associationId: integer('association_id').references(() => associations.id),
});

export const stockThresholds = pgTable('stock_thresholds', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => stockCategories.id, { onDelete: 'cascade' }).unique(),
  minQuantity: integer('min_quantity').default(0),
});
