export type UserRole = 
  | 'Président·e'
  | 'Vice-Président·e'
  | 'Secrétaire'
  | 'Secrétaire Adjoint·e'
  | 'Trésorier·ère'
  | 'Responsable Opérationnel·le'
  | 'Responsable Logistique'
  | 'Responsable Communication'
  | 'Responsable Innovation'
  | 'Responsable Prévention Santé'
  | 'Chef·fe d\'équipe'
  | 'Bénévole'
  // Legacy/Code roles
  | 'ADMIN_SITE'
  | 'PRESIDENT'
  | 'VICE_PRESIDENT'
  | 'SECRETARIAT'
  | 'TRESORIERE'
  | 'RESP_AIDE_ALIMENTAIRE'
  | 'RESP_LOGISTIQUE'
  | 'RESP_COMMUNICATION'
  | 'RESP_INNOVATION_SOCIALE'
  | 'RESP_PREV_SANTE'
  | 'BENEVOLE'
  | 'VISITEUR';

export type RightLevel = '-' | 'R' | 'RW' | 'RWD';

export interface User {
  id: number;
  username: string;
  email?: string;
  avatar_url?: string;
  title?: string; // Unique status/title
  role: UserRole; // Primary role for legacy support
  roles: UserRole[]; // All roles
  association_id?: number;
  association_name?: string;
  groups?: Group[];
  rights?: Record<string, RightLevel>;
  status?: string;
  token?: string;
  is_admin?: boolean;
}

export interface Group {
  id: number;
  name: string;
  color: string;
  description?: string;
  is_referent?: number | boolean;
}

export interface Role {
  id: number;
  name: UserRole;
  description: string;
}

export interface Resource {
  id: number;
  title: string;
  url: string;
  category: string;
  association_id?: number;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  author_name: string;
  association_id?: number;
  created_at: string;
}

export interface GalleryImage {
  id: number;
  url: string;
  caption?: string;
  created_at: string;
}

export interface StockCategory {
  id: number;
  name: string;
  color: string;
}

export interface StockItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_type: string;
  unit_value: number;
  category_id: number;
  category_name?: string;
  category_color?: string;
  expiry_date?: string;
  box_id?: string;
  status: 'available' | 'consumed';
  consumed_at?: string;
  maraude_event_id?: number;
  maraude_team_id?: number;
  maraude_event_title?: string;
  maraude_team_name?: string;
  created_at?: string;
}

export interface StockHistory {
  id: number;
  stock_id: number;
  item_name?: string;
  category_name?: string;
  change_amount: number;
  type: 'addition' | 'consumption';
  reason: string;
  maraude_event_id?: number;
  maraude_team_id?: number;
  maraude_date?: string;
  timestamp: string;
}

export interface Circuit {
  id: number;
  name: string;
  path_data: [number, number][];
  color: string;
  created_by: number;
  path_type?: 'line' | 'zone' | 'pedestrian';
}

export interface MaraudeEvent {
  id: number;
  date: string;
  status: 'planned' | 'in-progress' | 'completed';
  prep_location?: string;
  prep_time?: string;
  start_location?: string;
  start_time?: string;
  prep_lat?: number;
  prep_lng?: number;
  start_lat?: number;
  start_lng?: number;
  prep_description?: string;
  info_document_url?: string;
  meals_prepared?: number;
  meals_description?: string;
  name?: string;
  association_id: number;
  teams: MaraudeTeam[];
  prep_registrations?: { id: number, maraude_event_id: number, user_id: number, username: string }[];
}

export interface MaraudeTeam {
  id: number;
  event_id: number;
  team_name: string;
  path_data: [number, number][];
  color: string;
  path_type?: 'line' | 'zone' | 'pedestrian';
}

export interface Report {
  id: number;
  maraude_team_id: number;
  date: string;
  content: string;
  author: string;
  user_id: number;
  people_helped?: number;
}

export interface Distribution {
  id: number;
  lat: number;
  lng: number;
  timestamp: string;
  people_helped: number;
  maraude_team_id: number | null;
  maraude_event_id?: number;
  status?: 'completed' | 'pending' | 'cancelled';
  direct_help_count?: number;
  mobile_meal_count?: number;
  total_helped_count?: number;
  mobile_meals_delivered?: number;
}

export interface Registration {
  id: number;
  maraude_team_id: number;
  user_id: number;
  username?: string;
  is_leader: number;
  date: string;
}

export interface StockPartner {
  id: number;
  name: string;
  type: 'Magasin' | 'Donateur' | 'Autre';
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
}

export interface StockTodo {
  id: number;
  task: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at?: string;
}

export interface StockThreshold {
  id: number;
  category_id: number;
  min_quantity: number;
}
