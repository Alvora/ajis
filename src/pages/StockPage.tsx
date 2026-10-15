import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  History, 
  Calendar, 
  BarChart3, 
  Settings, 
  Table as TableIcon,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Undo2,
  ListTodo,
  Users,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Bell,
  Check,
  Clock,
  PieChart as PieChartIcon,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Info,
  AlertCircle
} from 'lucide-react';
import { StockItem, StockHistory, MaraudeEvent, StockCategory, StockPartner, StockTodo, StockThreshold } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { cn, formatDisplayDate } from '../lib/utils';
import { PageSkeleton } from '../components/Skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const StockPage = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'partners' | 'todo' | 'stats' | 'settings'>('dashboard');
  const [statsStartDate, setStatsStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [statsEndDate, setStatsEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [events, setEvents] = useState<MaraudeEvent[]>([]);
  const [partners, setPartners] = useState<StockPartner[]>([]);
  const [todos, setTodos] = useState<StockTodo[]>([]);
  const [thresholds, setThresholds] = useState<StockThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<StockItem | null>(null);
  const [showConsume, setShowConsume] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ 
    item_name: '', 
    quantity: 1, 
    unit_type: 'Unité', 
    unit_value: 1, 
    category_id: '', 
    expiry_date: '',
    box_id: 'C-' 
  });
  const [editItem, setEditItem] = useState<Partial<StockItem>>({});
  const [applyToLot, setApplyToLot] = useState<boolean>(false);
  const [consumeData, setConsumeData] = useState({ 
    maraude_event_id: '', 
    maraude_team_id: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [newCategory, setNewCategory] = useState({ name: '', color: '#10b981' });
  
  // New Form states
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartner, setNewPartner] = useState<Partial<StockPartner>>({ name: '', type: 'Magasin' });
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodo, setNewTodo] = useState<Partial<StockTodo>>({ task: '', priority: 'medium' });
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<Partial<StockThreshold>>({});
  
  // CSV Import / Export states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [parsedItems, setParsedItems] = useState<Array<{
    id_temp: number;
    item_name: string;
    category_name: string;
    quantity: number;
    unit_value: number;
    unit_type: string;
    expiry_date: string;
    box_id: string;
    isValid: boolean;
    error?: string;
  }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showFormatGuide, setShowFormatGuide] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'consumed'>('available');
  const [confirmDelete, setConfirmDelete] = useState<{ id: number, type: 'item' | 'category' } | null>(null);

  const { user, authFetch } = useAuth();
  const { showToast } = useToast();
  const canEditStock = user && (
    user.rights?.['Gestion des stocks'] === 'RW' || 
    user.rights?.['Gestion des stocks'] === 'RWD' ||
    user.groups?.some(g => g.name === 'Administrateur') ||
    user.roles?.includes('Président·e')
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await authFetch('/api/stock/dashboard-summary');
      
      if (!res.ok) {
        throw new Error("La requête a échoué");
      }

      const { stock, history, categories, events, partners, todos, thresholds } = await res.json();
      
      const normalizedStock: StockItem[] = Array.isArray(stock) ? stock.map((s: any) => ({
        ...s,
        id: s.id,
        item_name: s.item_name ?? s.itemName ?? '',
        quantity: s.quantity ?? 1,
        unit_type: s.unit_type ?? s.unitType ?? 'Unité',
        unit_value: s.unit_value ?? s.unitValue ?? 1,
        category_id: s.category_id ?? s.categoryId ?? null,
        category_name: s.category_name ?? s.categoryName ?? 'Sans catégorie',
        category_color: s.category_color ?? s.categoryColor ?? '#94a3b8',
        expiry_date: s.expiry_date ?? s.expiryDate ?? null,
        box_id: s.box_id ?? s.boxId ?? null,
        status: s.status ?? 'available',
        consumed_at: s.consumed_at ?? s.consumedAt ?? null,
        created_at: s.created_at ?? s.createdAt ?? null,
        maraude_event_id: s.maraude_event_id ?? s.maraudeEventId ?? null,
        maraude_team_id: s.maraude_team_id ?? s.maraudeTeamId ?? null,
        maraude_event_title: s.maraude_event_title ?? s.maraudeEventTitle ?? s.maraudeEventDate ?? '',
        maraude_team_name: s.maraude_team_name ?? s.maraudeTeamName ?? '',
      })) : [];

      const normalizedHistory: StockHistory[] = Array.isArray(history) ? history.map((h: any) => ({
        ...h,
        id: h.id,
        stock_id: h.stock_id ?? h.stockId,
        change_amount: h.change_amount ?? h.changeAmount ?? 1,
        type: h.type,
        reason: h.reason,
        maraude_event_id: h.maraude_event_id ?? h.maraudeEventId ?? null,
        maraude_team_id: h.maraude_team_id ?? h.maraudeTeamId ?? null,
        item_name: h.item_name ?? h.itemName ?? '',
        category_name: h.category_name ?? h.categoryName ?? '',
        timestamp: h.timestamp
      })) : [];

      const normalizedPartners: StockPartner[] = Array.isArray(partners) ? partners.map((p: any) => ({
        ...p,
        id: p.id,
        name: p.name,
        type: p.type,
        contact_name: p.contact_name ?? p.contactName ?? '',
        email: p.email ?? '',
        phone: p.phone ?? '',
        address: p.address ?? '',
        notes: p.notes ?? '',
        created_at: p.created_at ?? p.createdAt
      })) : [];

      const normalizedTodos: StockTodo[] = Array.isArray(todos) ? todos.map((t: any) => ({
        ...t,
        id: t.id,
        task: t.task,
        is_completed: typeof t.is_completed === 'boolean' ? t.is_completed : Boolean(t.isCompleted),
        priority: t.priority ?? 'medium',
        due_date: t.due_date ?? t.dueDate,
        created_at: t.created_at ?? t.createdAt
      })) : [];

      const normalizedThresholds: StockThreshold[] = Array.isArray(thresholds) ? thresholds.map((th: any) => ({
        ...th,
        id: th.id,
        category_id: th.category_id ?? th.categoryId,
        min_quantity: th.min_quantity ?? th.minQuantity ?? 0
      })) : [];

      setStock(normalizedStock);
      setHistory(normalizedHistory);
      setCategories(Array.isArray(categories) ? categories : []);
      setEvents(Array.isArray(events) ? events : []);
      setPartners(normalizedPartners);
      setTodos(normalizedTodos);
      setThresholds(normalizedThresholds);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      showToast("Erreur lors du chargement des données de stock", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure box_id starts with C- if provided
      const formattedBoxId = newItem.box_id && !newItem.box_id.startsWith('C-') 
        ? `C-${newItem.box_id}` 
        : newItem.box_id;

      const res = await authFetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, box_id: formattedBoxId })
      });
      
      if (res.ok) {
        setNewItem({ item_name: '', quantity: 1, unit_type: 'Unité', unit_value: 1, category_id: '', expiry_date: '', box_id: 'C-' });
        setShowAdd(false);
        fetchData();
        showToast("Article(s) ajouté(s) avec succès", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur lors de l'ajout de l'article", "error");
      }
    } catch (error) {
      showToast("Erreur réseau lors de l'ajout de l'article", "error");
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    try {
      // Ensure box_id starts with C- if provided
      const formattedBoxId = editItem.box_id && !editItem.box_id.startsWith('C-') 
        ? `C-${editItem.box_id}` 
        : editItem.box_id;

      const res = await authFetch(`/api/stock/${showEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...editItem, 
          box_id: formattedBoxId,
          apply_to_lot: applyToLot 
        })
      });
      
      if (res.ok) {
        setShowEdit(null);
        setApplyToLot(false);
        fetchData();
        showToast(
          applyToLot 
            ? "Tous les articles identiques du lot ont été mis à jour avec succès" 
            : "Article modifié avec succès", 
          "success"
        );
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur lors de la modification de l'article", "error");
      }
    } catch (error) {
      showToast("Erreur réseau lors de la modification de l'article", "error");
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/stock/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartner)
      });
      if (res.ok) {
        setNewPartner({ name: '', type: 'Magasin' });
        setShowAddPartner(false);
        fetchData();
        showToast("Partenaire ajouté", "success");
      }
    } catch (e) {
      showToast("Erreur lors de l'ajout du partenaire", "error");
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/stock/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo)
      });
      if (res.ok) {
        setNewTodo({ task: '', priority: 'medium' });
        setShowAddTodo(false);
        fetchData();
        showToast("Tâche ajoutée", "success");
      }
    } catch (e) {
      showToast("Erreur lors de l'ajout de la tâche", "error");
    }
  };

  const toggleTodo = async (id: number, currentStatus: boolean) => {
    try {
      const res = await authFetch(`/api/stock/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !currentStatus })
      });
      if (res.ok) fetchData();
    } catch (e) {
      showToast("Erreur lors de la mise à jour de la tâche", "error");
    }
  };

  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/stock/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingThreshold)
      });
      if (res.ok) {
        setEditingThreshold({});
        setShowThresholdModal(false);
        fetchData();
        showToast("Seuil mis à jour", "success");
      }
    } catch (e) {
      showToast("Erreur lors de la mise à jour du seuil", "error");
    }
  };

  const handleConsumeItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConsume) return;
    const res = await authFetch('/api/stock/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stock_id: showConsume,
        quantity: 1,
        ...consumeData
      })
    });
    if (res.ok) {
      setShowConsume(null);
      setConsumeData({ maraude_event_id: '', maraude_team_id: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
      showToast("Article consommé avec succès", "success");
    } else {
      const err = await res.json();
      showToast(err.error, "error");
    }
  };

  const handleReturnStock = async (stockId: number) => {
    try {
      const res = await authFetch('/api/stock/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stockId })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error returning stock:", error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await authFetch('/api/stock/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory)
    });
    setNewCategory({ name: '', color: '#10b981' });
    fetchData();
  };

  const handleDeleteCategory = async (id: number) => {
    await authFetch(`/api/stock/categories/${id}`, { method: 'DELETE' });
    showToast("Catégorie supprimée", "success");
    fetchData();
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const res = await authFetch(`/api/stock/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Article supprimé avec succès.", "success");
        fetchData();
      } else {
        const err = await res.json();
        showToast(`Erreur lors de la suppression : ${err.error}`, "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Une erreur est survenue lors de la suppression.", "error");
    }
  };

  // CSV Export Handler
  const handleExportCSV = (onlyFiltered: boolean = false) => {
    const itemsToExport = onlyFiltered ? filteredStock : stock;
    if (itemsToExport.length === 0) {
      showToast("Aucun article à exporter", "error");
      return;
    }

    const headers = [
      "ID Article",
      "Carton",
      "Article",
      "Catégorie",
      "Quantité",
      "Format",
      "Unité",
      "Date Péremption",
      "Statut",
      "Date Collecte",
      "Date Consommation",
      "Maraude",
      "Équipe"
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = itemsToExport.map(item => [
      escapeCSV(`A-${item.id}`),
      escapeCSV(item.box_id || (item as any).boxId || ''),
      escapeCSV(item.item_name || (item as any).itemName || 'Article'),
      escapeCSV(item.category_name || (item as any).categoryName || 'Sans catégorie'),
      escapeCSV(1),
      escapeCSV(item.unit_value ?? (item as any).unitValue ?? 1),
      escapeCSV(item.unit_type || (item as any).unitType || 'Unité'),
      escapeCSV(item.expiry_date || (item as any).expiryDate || ''),
      escapeCSV(item.status === 'consumed' ? 'Consommé' : 'En stock'),
      escapeCSV(item.created_at || (item as any).createdAt ? new Date(item.created_at || (item as any).createdAt).toLocaleDateString('fr-FR') : ''),
      escapeCSV(item.consumed_at || (item as any).consumedAt ? new Date(item.consumed_at || (item as any).consumedAt).toLocaleDateString('fr-FR') : ''),
      escapeCSV(item.maraude_event_title || (item as any).maraudeEventTitle || (item as any).maraudeEventDate || ''),
      escapeCSV(item.maraude_team_name || (item as any).maraudeTeamName || '')
    ]);

    const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `export_stock_${onlyFiltered ? 'filtre_' : ''}${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`${itemsToExport.length} article(s) exporté(s) au format CSV`, "success");
  };

  // CSV Template Download Handler
  const handleDownloadTemplate = () => {
    const headers = [
      "Article",
      "Catégorie",
      "Quantité",
      "Format",
      "Unité",
      "Péremption",
      "Carton"
    ];

    const sampleRows = [
      ["Lait demi-écrémé", "Alimentaire", "12", "1", "L", "2026-12-31", "C-01"],
      ["Brosses à dents", "Hygiène", "20", "1", "Unité", "", "C-02"],
      ["Couvertures polaires", "Vêtements & Literie", "10", "1", "Unité", "", "C-05"],
      ["Pâtes coquillettes 500g", "Alimentaire", "15", "500", "g", "2027-06-30", "C-01"],
      ["Gel douche 250ml", "Hygiène", "8", "250", "ml", "2028-01-15", "C-02"]
    ];

    const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent = "\uFEFF" + [headers.map(escapeCSV).join(";"), ...sampleRows.map(r => r.map(escapeCSV).join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modele_import_stock.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Modèle CSV téléchargé avec succès", "info");
  };

  // CSV Parsing & Import Handlers
  const processCSVContent = (text: string) => {
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    if (!cleanText) {
      setParsedItems([]);
      showToast("Le fichier CSV est vide", "error");
      return;
    }

    const lines = cleanText.split(/\r\n|\n|\r/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setParsedItems([]);
      return;
    }

    const firstLine = lines[0];
    const semiCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    let delimiter = ';';
    if (tabCount > semiCount && tabCount > commaCount) delimiter = '\t';
    else if (commaCount > semiCount) delimiter = ',';

    const splitLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = splitLine(lines[0]).map(h => h.toLowerCase().replace(/['"_\s-]/g, ''));
    
    const findColIndex = (aliases: string[]) => {
      const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/['"_\s-]/g, ''));
      return headerRow.findIndex(h => normalizedAliases.some(alias => h.includes(alias) || alias.includes(h)));
    };

    const nameIdx = findColIndex(['article', 'nom', 'nomdelarticle', 'itemname', 'name', 'produit', 'designation', 'intitule']);
    const catIdx = findColIndex(['categorie', 'catégorie', 'category', 'categoryname', 'famille', 'type']);
    const qtyIdx = findColIndex(['quantite', 'quantité', 'quantity', 'qte', 'nombre', 'count']);
    const valIdx = findColIndex(['format', 'valeur', 'valeurunite', 'unitvalue', 'poids', 'volume', 'contenance']);
    const unitIdx = findColIndex(['unite', 'unité', 'unittype', 'typeunite', 'mesure']);
    const expIdx = findColIndex(['peremption', 'péremption', 'dateperemption', 'expirydate', 'dlc', 'dluo', 'expiration']);
    const boxIdx = findColIndex(['carton', 'box', 'boxid', 'idcarton', 'numerocarton', 'bac', 'boite']);

    const items: Array<{
      id_temp: number;
      item_name: string;
      category_name: string;
      quantity: number;
      unit_value: number;
      unit_type: string;
      expiry_date: string;
      box_id: string;
      isValid: boolean;
      error?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const row = splitLine(lines[i]);
      if (row.length === 0 || row.every(cell => !cell)) continue;

      const rawName = nameIdx !== -1 && row[nameIdx] !== undefined ? row[nameIdx] : (nameIdx === -1 ? row[0] : '');
      const itemName = rawName.replace(/^["']|["']$/g, '').trim();

      if (!itemName) {
        items.push({
          id_temp: i,
          item_name: '',
          category_name: '',
          quantity: 1,
          unit_value: 1,
          unit_type: 'Unité',
          expiry_date: '',
          box_id: '',
          isValid: false,
          error: `Ligne ${i + 1} : Le nom de l'article est manquant`
        });
        continue;
      }

      const catName = catIdx !== -1 && row[catIdx] ? row[catIdx].replace(/^["']|["']$/g, '').trim() : '';
      const rawQty = qtyIdx !== -1 && row[qtyIdx] ? row[qtyIdx].replace(/^["']|["']$/g, '').trim() : '1';
      const quantity = Math.max(1, parseInt(rawQty) || 1);

      const rawVal = valIdx !== -1 && row[valIdx] ? row[valIdx].replace(/^["']|["']$/g, '').replace(',', '.').trim() : '1';
      const unitValue = parseFloat(rawVal) || 1;

      const unitType = unitIdx !== -1 && row[unitIdx] ? row[unitIdx].replace(/^["']|["']$/g, '').trim() : 'Unité';

      let rawExp = expIdx !== -1 && row[expIdx] ? row[expIdx].replace(/^["']|["']$/g, '').trim() : '';
      let expiryDate = '';
      if (rawExp) {
        const frMatch = rawExp.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (frMatch) {
          const day = frMatch[1].padStart(2, '0');
          const month = frMatch[2].padStart(2, '0');
          const year = frMatch[3];
          expiryDate = `${year}-${month}-${day}`;
        } else if (rawExp.match(/^\d{4}-\d{2}-\d{2}$/)) {
          expiryDate = rawExp;
        } else {
          expiryDate = rawExp;
        }
      }

      let boxId = boxIdx !== -1 && row[boxIdx] ? row[boxIdx].replace(/^["']|["']$/g, '').trim() : '';
      if (boxId && !boxId.startsWith('C-')) {
        boxId = `C-${boxId}`;
      }

      items.push({
        id_temp: i,
        item_name: itemName,
        category_name: catName,
        quantity,
        unit_value: unitValue,
        unit_type: unitType || 'Unité',
        expiry_date: expiryDate,
        box_id: boxId,
        isValid: true
      });
    }

    setParsedItems(items);
    if (items.length === 0) {
      showToast("Aucune donnée d'article trouvée dans le fichier", "warning");
    } else {
      const validCount = items.filter(i => i.isValid).length;
      showToast(`${validCount} ligne(s) analysée(s) avec succès`, "success");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processCSVContent(content);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        showToast("Veuillez sélectionner un fichier CSV (.csv)", "error");
        return;
      }
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processCSVContent(content);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleExecuteImport = async () => {
    const validItems = parsedItems.filter(i => i.isValid);
    if (validItems.length === 0) {
      showToast("Aucun article valide à importer", "error");
      return;
    }

    setIsImporting(true);
    try {
      const res = await authFetch('/api/stock/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validItems })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          `Importation réussie : ${data.count} article(s) ajouté(s)${data.categories_created > 0 ? ` et ${data.categories_created} nouvelle(s) catégorie(s) créée(s)` : ''}`,
          "success"
        );
        setShowImportModal(false);
        setParsedItems([]);
        setImportFileName('');
        fetchData();
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur lors de l'importation", "error");
      }
    } catch (error) {
      showToast("Erreur de communication avec le serveur", "error");
    } finally {
      setIsImporting(false);
    }
  };

  // Data processing for charts
  const temporalData = React.useMemo(() => {
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split('T')[0];
    });

    return last14Days.map(date => {
      const dayData: any = { date: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) };
      (categories || []).forEach(cat => {
        // Calculate stock level for this category on this day
        // We count items that were created on or before this date AND (not consumed OR consumed after this date)
        const count = (stock || []).filter(s => {
          if (!s) return false;
          const catId = s.category_id ?? (s as any).categoryId;
          if (catId !== cat.id) return false;
          
          const createdAtVal = s.created_at || (s as any).createdAt;
          const createdAt = createdAtVal ? createdAtVal.split(' ')[0] : '1970-01-01';
          const isCreated = createdAt <= date;
          
          if (!isCreated) return false;
          
          if (s.status === 'available') return true;
          
          const consumedAtVal = s.consumed_at || (s as any).consumedAt;
          const consumedAt = consumedAtVal ? consumedAtVal.split('T')[0] : '9999-12-31';
          return consumedAt > date;
        }).length;
        
        dayData[cat.name] = count;
      });
      return dayData;
    });
  }, [stock, categories]);

  const filteredStock = React.useMemo(() => (stock || []).filter(item => {
    if (!item) return false;
    const itemName = String(item.item_name || (item as any).itemName || '');
    const itemId = item.id != null ? String(item.id) : '';
    const boxId = String(item.box_id || (item as any).boxId || '');
    const q = (searchQuery || '').trim().toLowerCase();

    const matchesSearch = 
      !q ||
      itemName.toLowerCase().includes(q) ||
      itemId.includes(q) ||
      boxId.toLowerCase().includes(q);

    const categoryId = item.category_id ?? (item as any).categoryId;
    const matchesCategory = filterCategory === 'all' || (categoryId != null && categoryId === parseInt(filterCategory));
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  }), [stock, searchQuery, filterCategory, filterStatus]);

  const expiringSoon = React.useMemo(() => (stock || []).filter(item => {
    if (!item) return false;
    const expiryVal = item.expiry_date || (item as any).expiryDate;
    if (!expiryVal || item.status === 'consumed') return false;
    const expiry = new Date(expiryVal);
    if (isNaN(expiry.getTime())) return false;
    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
    return expiry <= twoMonthsFromNow;
  }), [stock]);

  const stockStats = React.useMemo(() => {
    const start = new Date(statsStartDate);
    const end = new Date(statsEndDate);
    const days: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    return days.map(date => {
      const collected = history.filter(h => h.type === 'addition' && h.timestamp?.startsWith(date)).length;
      const distributed = history.filter(h => h.type === 'consumption' && h.timestamp?.startsWith(date)).length;
      return { 
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), 
        collected, 
        distributed 
      };
    });
  }, [history, statsStartDate, statsEndDate]);

  const stockEvolutionData = React.useMemo(() => {
    const start = new Date(statsStartDate);
    const end = new Date(statsEndDate);
    const days: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    // To calculate the stock level over time, we need to know the stock at the start.
    // We can work backwards from current stock or forwards from history.
    // Since we don't have the initial stock level, we'll calculate the relative change from the start of history.
    
    // Sort history by timestamp
    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let currentLevel = 0;
    const evolution: { date: string, level: number }[] = [];

    // Map of date to total change on that date
    const dailyChanges = new Map<string, number>();
    sortedHistory.forEach(h => {
      const date = h.timestamp?.substring(0, 10);
      if (date) {
        const change = h.type === 'addition' ? h.change_amount : -h.change_amount;
        dailyChanges.set(date, (dailyChanges.get(date) || 0) + change);
      }
    });

    // Calculate cumulative level for all dates in history up to the end date
    const allDates = Array.from(dailyChanges.keys()).sort();
    const levelByDate = new Map<string, number>();
    let runningTotal = 0;
    
    // We need to find the starting level at statsStartDate.
    // Let's assume the stock was 0 at the very beginning of history.
    allDates.forEach(date => {
      runningTotal += dailyChanges.get(date) || 0;
      levelByDate.set(date, runningTotal);
    });

    return days.map(date => {
      // Find the last known level on or before this date
      let level = 0;
      const datesBefore = allDates.filter(d => d <= date);
      if (datesBefore.length > 0) {
        level = levelByDate.get(datesBefore[datesBefore.length - 1]) || 0;
      }
      
      return {
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        level
      };
    });
  }, [history, statsStartDate, statsEndDate]);

  const categoryStats = React.useMemo(() => {
    return categories.map(cat => ({
      name: cat.name,
      value: stock.filter(i => i.category_id === cat.id && i.status === 'available').length,
      color: cat.color || '#78716c'
    })).filter(c => c.value > 0);
  }, [stock, categories]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-stone-50 dark:bg-stone-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight text-text-main">
            <Package className="text-brand-red" /> Gestion des Stocks
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm">Suivi précis des denrées et matériel de l'association.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={fetchData}
            className="bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-sm"
            title="Rafraîchir les données"
          >
            <History size={20} />
          </button>

          <button 
            onClick={() => handleExportCSV(false)}
            className="bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 px-4 py-3 rounded-2xl font-bold flex items-center gap-2 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-sm text-sm"
            title="Exporter tout l'inventaire au format CSV"
          >
            <Download size={18} className="text-emerald-600 dark:text-emerald-400" /> 
            <span>Exporter CSV</span>
          </button>

          {canEditStock && (
            <button 
              onClick={() => {
                setParsedItems([]);
                setImportFileName('');
                setShowImportModal(true);
              }}
              className="bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-200 px-4 py-3 rounded-2xl font-bold flex items-center gap-2 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all shadow-sm text-sm"
              title="Importer un fichier CSV d'articles de stock"
            >
              <Upload size={18} className="text-blue-600 dark:text-blue-400" /> 
              <span>Importer CSV</span>
            </button>
          )}

          {canEditStock && (
            <button 
              onClick={() => setShowAdd(true)}
              className="bg-brand-green text-white px-5 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-brand-green/90 transition-all shadow-sm text-sm"
            >
              <Plus size={20} /> Ajouter un article
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl mb-8 w-fit">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'dashboard' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <BarChart3 size={18} /> Tableau de Bord
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'inventory' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <TableIcon size={18} /> Inventaire
        </button>
        <button 
          onClick={() => setActiveTab('partners')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'partners' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <Users size={18} /> Partenaires
        </button>
        <button 
          onClick={() => setActiveTab('todo')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'todo' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <ListTodo size={18} /> To-Do List
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'stats' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <TrendingUp size={18} /> Statistiques
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
            activeTab === 'settings' ? "bg-bg-card text-text-main shadow-sm" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <Settings size={18} /> Paramètres
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Expiry Warnings */}
          {expiringSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-amber-600" />
                <h3 className="font-bold text-amber-900">Alertes Péremption (Prochains 2 mois)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiringSoon.map(item => (
                  <div key={item.id} className="bg-bg-card p-4 rounded-2xl border border-amber-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-text-main">{item.item_name}</p>
                      <p className="text-xs text-stone-500">{item.unit_value}{item.unit_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600 uppercase">Expire le</p>
                      <p className="font-mono text-sm">{formatDisplayDate(item.expiry_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Temporal Evolution Chart */}
          <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-text-main">
              <History className="text-brand-red" /> Évolution temporelle des stocks
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={temporalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
                  <Tooltip 
                    cursor={{fill: '#f5f5f4'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Legend iconType="circle" />
                  {categories.map((cat, idx) => (
                    <Bar 
                      key={cat.id} 
                      dataKey={cat.name} 
                      stackId="a" 
                      fill={cat.color} 
                      radius={idx === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-green/10 dark:bg-brand-green/20 p-6 rounded-3xl border border-brand-green/20 dark:border-brand-green/50">
              <p className="text-brand-green dark:text-brand-green text-xs font-bold uppercase tracking-widest mb-1">Total Articles Disponibles</p>
              <p className="text-4xl font-black text-brand-green dark:text-brand-green">{stock.filter(s => s.status === 'available').length}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/50">
              <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Consommés ce mois</p>
              <p className="text-4xl font-black text-blue-900 dark:text-blue-100">
                {history.filter(h => h.type === 'consumption' && new Date(h.timestamp).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
            <div className="bg-stone-50 dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700">
              <p className="text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Catégories Actives</p>
              <p className="text-4xl font-black text-text-main">{categories.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Filters */}
          <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher un article (nom, ID carton, ID article)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-stone-900 rounded-2xl border-none outline-none focus:ring-2 focus:ring-brand-green transition-all text-text-main"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-brand-green text-sm font-medium text-stone-900 dark:text-stone-100"
              >
                <option value="all" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">Toutes les catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">
                    {cat.name}
                  </option>
                ))}
              </select>
              <select 
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-brand-green text-sm font-medium text-stone-900 dark:text-stone-100"
              >
                <option value="all" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">Tous les statuts</option>
                <option value="available" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">En stock</option>
                <option value="consumed" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">Consommé</option>
              </select>

              <button
                onClick={() => handleExportCSV(Boolean(searchQuery || filterCategory !== 'all' || filterStatus !== 'available'))}
                className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all shadow-sm"
                title={searchQuery || filterCategory !== 'all' || filterStatus !== 'available' ? "Exporter les articles filtrés" : "Exporter la totalité du stock"}
              >
                <Download size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Exporter ({filteredStock.length})</span>
              </button>

              {canEditStock && (
                <button
                  onClick={() => {
                    setParsedItems([]);
                    setImportFileName('');
                    setShowImportModal(true);
                  }}
                  className="bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-1.5 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all shadow-sm"
                  title="Importer depuis un fichier CSV"
                >
                  <Upload size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>Importer CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700">
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">ID Article</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">ID Carton</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Article</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Catégorie</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Format</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Collecte / Consommation</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Maraude</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Péremption</th>
                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {filteredStock.length > 0 ? (
                    filteredStock.map(item => (
                      <tr key={item.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-brand-red/10 text-brand-red rounded text-[10px] font-bold font-mono">
                          A-{item.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.box_id ? (
                          <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded text-[10px] font-bold font-mono border border-stone-200 dark:border-stone-700">
                            {item.box_id}
                          </span>
                        ) : (
                          <span className="text-stone-300 dark:text-stone-600">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-text-main">{item.item_name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap"
                          style={{ backgroundColor: item.category_color || '#78716c' }}
                        >
                          {item.category_name || 'Sans catégorie'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        {item.unit_value} {item.unit_type}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-[10px] text-stone-500">
                            <span className="font-bold uppercase text-[8px] text-stone-400">Collecte:</span>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                          </div>
                          {item.status === 'consumed' && item.consumed_at && (
                            <div className="flex items-center gap-1 text-[10px] text-brand-green">
                              <span className="font-bold uppercase text-[8px] text-stone-400">Conso:</span>
                              {new Date(item.consumed_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'consumed' ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] font-bold text-stone-700 leading-tight">
                              {item.maraude_event_title || 'Événement inconnu'}
                            </p>
                            <p className="text-[9px] text-stone-400 italic">
                              {item.maraude_team_name || 'Équipe inconnue'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.expiry_date ? (
                          <div className={cn(
                            "flex items-center gap-2 text-xs font-bold",
                            new Date(item.expiry_date) < new Date() ? "text-red-500" : "text-stone-600 dark:text-stone-300"
                          )}>
                            <Calendar size={14} /> {formatDisplayDate(item.expiry_date)}
                          </div>
                        ) : <span className="text-stone-300 dark:text-stone-600">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.status === 'available' && (
                            <button 
                              onClick={() => setShowConsume(item.id)}
                              className="p-2 bg-brand-green/10 text-brand-green rounded-xl hover:bg-brand-green/20 transition-colors"
                              title="Consommer"
                            >
                              <ArrowRight size={18} />
                            </button>
                          )}
                          {item.status === 'consumed' && canEditStock && (
                            <button 
                              onClick={() => handleReturnStock(item.id)}
                              className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors"
                              title="Remettre en stock"
                            >
                              <Undo2 size={18} />
                            </button>
                          )}
                          {canEditStock && (
                            <button 
                              onClick={() => {
                                const cleanExp = item.expiry_date 
                                  ? (item.expiry_date.includes('T') ? item.expiry_date.split('T')[0] : item.expiry_date)
                                  : '';
                                setShowEdit(item);
                                setEditItem({ ...item, expiry_date: cleanExp });
                                setApplyToLot(false);
                              }}
                              className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                              title="Modifier"
                            >
                              <Settings size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-stone-400">
                        <Package size={48} strokeWidth={1} />
                        <p className="font-medium">Aucun article trouvé dans l'inventaire.</p>
                        <p className="text-xs uppercase tracking-widest font-black opacity-60">Essayez de modifier vos filtres ou d'ajouter un article.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Partners Tab */}
      {activeTab === 'partners' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black flex items-center gap-2 text-text-main">
              <Users className="text-brand-red" /> Gestion des Partenaires
            </h3>
            <button 
              onClick={() => setShowAddPartner(true)}
              className="bg-brand-green text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-green/90 transition-all shadow-sm text-sm"
            >
              <Plus size={18} /> Nouveau Partenaire
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.length > 0 ? (
              partners.map(partner => (
                <div key={partner.id} className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="px-2 py-1 bg-stone-100 dark:bg-stone-900 text-stone-500 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                        {partner.type}
                      </span>
                      <h4 className="text-lg font-bold text-text-main">{partner.name}</h4>
                    </div>
                    <button 
                      onClick={async () => {
                        if (confirm("Supprimer ce partenaire ?")) {
                          await authFetch(`/api/stock/partners/${partner.id}`, { method: 'DELETE' });
                          fetchData();
                        }
                      }}
                      className="p-2 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {partner.contact_name && (
                      <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                        <Users size={16} className="text-stone-400" />
                        <span>{partner.contact_name}</span>
                      </div>
                    )}
                    {partner.email && (
                      <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                        <Mail size={16} className="text-stone-400" />
                        <a href={`mailto:${partner.email}`} className="hover:text-brand-red transition-colors">{partner.email}</a>
                      </div>
                    )}
                    {partner.phone && (
                      <div className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400">
                        <Phone size={16} className="text-stone-400" />
                        <a href={`tel:${partner.phone}`} className="hover:text-brand-red transition-colors">{partner.phone}</a>
                      </div>
                    )}
                    {partner.address && (
                      <div className="flex items-start gap-3 text-sm text-stone-600 dark:text-stone-400">
                        <MapPin size={16} className="text-stone-400 mt-0.5" />
                        <span>{partner.address}</span>
                      </div>
                    )}
                  </div>

                  {partner.notes && (
                    <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-700">
                      <p className="text-xs text-stone-500 italic leading-relaxed">
                        {partner.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700">
                <Users size={48} className="mx-auto text-stone-200 mb-4" />
                <p className="text-stone-500 font-medium">Aucun partenaire enregistré.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* To-Do Tab */}
      {activeTab === 'todo' && (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl mx-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black flex items-center gap-2 text-text-main">
              <ListTodo className="text-brand-red" /> Suivi des Maraudes & Stock
            </h3>
            <button 
              onClick={() => setShowAddTodo(true)}
              className="bg-brand-green text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-green/90 transition-all shadow-sm text-sm"
            >
              <Plus size={18} /> Nouvelle Tâche
            </button>
          </div>

          <div className="bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
            <div className="divide-y divide-stone-100 dark:divide-stone-700">
              {todos.length > 0 ? (
                todos.map(todo => (
                  <div key={todo.id} className={cn(
                    "p-6 flex items-start gap-4 transition-colors group",
                    todo.is_completed ? "bg-stone-50/50 dark:bg-stone-900/50" : "hover:bg-stone-50 dark:hover:bg-stone-900"
                  )}>
                    <button 
                      onClick={() => toggleTodo(todo.id, !!todo.is_completed)}
                      className={cn(
                        "mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        todo.is_completed 
                          ? "bg-brand-green border-brand-green text-white" 
                          : "border-stone-200 dark:border-stone-700 hover:border-brand-green"
                      )}
                    >
                      {todo.is_completed && <Check size={14} strokeWidth={4} />}
                    </button>
                    
                    <div className="flex-grow">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className={cn(
                          "font-bold text-text-main transition-all",
                          todo.is_completed && "line-through text-stone-400"
                        )}>
                          {todo.task}
                        </h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                          todo.priority === 'high' ? "bg-red-100 text-red-600" :
                          todo.priority === 'medium' ? "bg-amber-100 text-amber-600" :
                          "bg-blue-100 text-blue-600"
                        )}>
                          {todo.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Créé le {new Date(todo.created_at!).toLocaleDateString()}
                        </span>
                        {todo.due_date && (
                          <span className={cn(
                            "flex items-center gap-1 font-bold",
                            new Date(todo.due_date) < new Date() && !todo.is_completed ? "text-red-500" : "text-stone-500"
                          )}>
                            <Clock size={12} />
                            Échéance: {new Date(todo.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={async () => {
                        if (confirm("Supprimer cette tâche ?")) {
                          await authFetch(`/api/stock/todos/${todo.id}`, { method: 'DELETE' });
                          fetchData();
                        }
                      }}
                      className="p-2 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center">
                  <ListTodo size={48} className="mx-auto text-stone-200 mb-4" />
                  <p className="text-stone-500 font-medium">Toutes les tâches sont terminées !</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Filters */}
          <div className="bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-stone-400" />
              <span className="text-sm font-bold text-stone-500 uppercase tracking-wider">Filtres :</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-stone-400 uppercase">Du</label>
              <input 
                type="date" 
                value={statsStartDate}
                onChange={e => setStatsStartDate(e.target.value)}
                className="bg-stone-50 dark:bg-stone-900 border-none rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-stone-400 uppercase">Au</label>
              <input 
                type="date" 
                value={statsEndDate}
                onChange={e => setStatsEndDate(e.target.value)}
                className="bg-stone-50 dark:bg-stone-900 border-none rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <button 
              onClick={() => {
                const d = new Date();
                setStatsEndDate(d.toISOString().split('T')[0]);
                d.setDate(d.getDate() - 30);
                setStatsStartDate(d.toISOString().split('T')[0]);
              }}
              className="text-xs font-bold text-brand-green hover:underline"
            >
              30 derniers jours
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Collection vs Distribution */}
            <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-text-main">
                <TrendingUp className="text-brand-red" /> Flux de Stock
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stockStats}>
                    <defs>
                      <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDistributed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="collected" name="Collectés" stroke="#22c55e" fillOpacity={1} fill="url(#colorCollected)" strokeWidth={3} />
                    <Area type="monotone" dataKey="distributed" name="Distribués" stroke="#ef4444" fillOpacity={1} fill="url(#colorDistributed)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-text-main">
                <PieChartIcon className="text-brand-red" /> Répartition par Catégorie
              </h3>
              <div className="h-80 flex flex-col md:flex-row items-center">
                <div className="w-full md:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0">
                  {categoryStats.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-stone-600 dark:text-stone-400">{cat.name}</span>
                      </div>
                      <span className="font-bold text-text-main">{cat.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stock Level Evolution */}
            <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm lg:col-span-2">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-text-main">
                <History className="text-brand-green" /> Évolution du Niveau de Stock Total
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stockEvolutionData}>
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#78716c'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="level" name="Niveau de Stock" stroke="#10b981" fillOpacity={1} fill="url(#colorLevel)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Management */}
            <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-text-main">
                <Settings className="text-stone-400" /> Gestion des Catégories
              </h3>
              
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-8">
                <input 
                  required
                  type="text" 
                  placeholder="Nom de la catégorie..." 
                  value={newCategory.name}
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  className="flex-grow px-4 py-3 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 border border-stone-200 dark:border-stone-700 rounded-2xl outline-none focus:ring-2 focus:ring-brand-green font-medium"
                />
                <div className="relative w-14 h-12 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                  <input 
                    type="color" 
                    value={newCategory.color}
                    onChange={e => setNewCategory({...newCategory, color: e.target.value})}
                    className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"
                  />
                </div>
                <button type="submit" className="bg-stone-900 dark:bg-brand-green text-white px-6 rounded-2xl font-bold hover:bg-stone-800 dark:hover:bg-brand-green/90 transition-all shadow-sm">
                  Ajouter
                </button>
              </form>

              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900 rounded-2xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-bold text-text-main">{cat.name}</span>
                    </div>
                    <button 
                      onClick={() => setConfirmDelete({ id: cat.id, type: 'category' })}
                      className="p-2 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert Thresholds */}
            <div className="bg-white dark:bg-stone-800 p-8 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2 text-text-main">
                <Bell className="text-brand-red" /> Seuils d'Alerte
              </h3>
              <p className="text-sm text-stone-500 mb-6">Définissez une quantité minimale pour chaque catégorie. Une alerte apparaîtra si le stock descend en dessous.</p>
              
              <div className="space-y-4">
                {categories.map(cat => {
                  const threshold = thresholds.find(t => t.category_id === cat.id);
                  const currentStock = stock.filter(i => i.category_id === cat.id && i.status === 'available').length;
                  const isLow = threshold && currentStock < threshold.min_quantity;

                  return (
                    <div key={cat.id} className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all",
                      isLow ? "bg-red-50 border-red-200" : "bg-stone-50 dark:bg-stone-900 border-transparent"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <div>
                          <p className="font-bold text-sm text-text-main">{cat.name}</p>
                          <p className="text-[10px] text-stone-500">Stock actuel: {currentStock}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingThreshold({ category_id: cat.id, min_quantity: threshold?.min_quantity || 0 });
                          setShowThresholdModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-bold hover:bg-stone-50 transition-all"
                      >
                        {threshold ? `Seuil: ${threshold.min_quantity}` : "Définir seuil"}
                        <Settings size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stock Info */}
            <div className="bg-brand-green p-8 rounded-3xl text-white shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black mb-4">Aide à la gestion</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-6">
                  Le stock est géré unité par unité pour une traçabilité maximale. 
                  Chaque article ajouté possède ses propres caractéristiques (poids/volume, péremption).
                </p>
                <ul className="space-y-3 text-sm font-medium">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                    Utilisez les catégories pour filtrer vos inventaires.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                    Les alertes de péremption s'activent 2 mois avant l'échéance.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                    Liez les consommations aux maraudes pour vos rapports.
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Communication Interne</p>
                <p className="text-lg font-bold">Groupe WhatsApp Membres</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal 
        isOpen={showAdd} 
        onClose={() => setShowAdd(false)}
        title="Nouvel Article"
      >
        <form onSubmit={handleAddItem} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom de l'article</label>
              <input 
                required 
                type="text" 
                value={newItem.item_name} 
                onChange={e => setNewItem({...newItem, item_name: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
                placeholder="Ex: Soupe de légumes" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Catégorie</label>
              <select 
                required
                value={newItem.category_id} 
                onChange={e => setNewItem({...newItem, category_id: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
              >
                <option value="">Sélectionner...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nombre d'articles à créer</label>
              <input 
                required 
                type="number" 
                min="1"
                max="50"
                value={newItem.quantity} 
                onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Valeur Unitaire</label>
                <input 
                  required 
                  type="number" 
                  step="0.1"
                  value={newItem.unit_value} 
                  onChange={e => setNewItem({...newItem, unit_value: parseFloat(e.target.value)})} 
                  className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Unité</label>
                <select 
                  value={newItem.unit_type} 
                  onChange={e => setNewItem({...newItem, unit_type: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
                >
                  <option value="Unité">Unité</option>
                  <option value="L">Litres (L)</option>
                  <option value="Kg">Kilogrammes (Kg)</option>
                  <option value="g">Grammes (g)</option>
                  <option value="ml">Millilitres (ml)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Date de péremption</label>
              <input 
                type="date" 
                value={newItem.expiry_date} 
                onChange={e => setNewItem({...newItem, expiry_date: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Identifiant Carton</label>
              <input 
                type="text" 
                value={newItem.box_id} 
                onChange={e => setNewItem({...newItem, box_id: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
                placeholder="Ex: C-01"
              />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={() => setShowAdd(false)}
              className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm"
            >
              Enregistrer l'article
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal 
        isOpen={!!showEdit} 
        onClose={() => setShowEdit(null)}
        title="Modifier l'Article"
      >
        <form onSubmit={handleEditItem} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom de l'article</label>
              <input 
                required 
                type="text" 
                value={editItem.item_name || ''} 
                onChange={e => setEditItem({...editItem, item_name: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Catégorie</label>
              <select 
                required
                value={editItem.category_id || ''} 
                onChange={e => setEditItem({...editItem, category_id: parseInt(e.target.value)})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
              >
                <option value="">Sélectionner...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Valeur Unitaire</label>
                <input 
                  required 
                  type="number" 
                  step="0.1"
                  value={editItem.unit_value || 0} 
                  onChange={e => setEditItem({...editItem, unit_value: parseFloat(e.target.value)})} 
                  className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Unité</label>
                <select 
                  value={editItem.unit_type || 'Unité'} 
                  onChange={e => setEditItem({...editItem, unit_type: e.target.value})} 
                  className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
                >
                  <option value="Unité">Unité</option>
                  <option value="L">Litres (L)</option>
                  <option value="Kg">Kilogrammes (Kg)</option>
                  <option value="g">Grammes (g)</option>
                  <option value="ml">Millilitres (ml)</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2 ml-1">
                <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Date de péremption</label>
                {editItem.expiry_date && (
                  <button 
                    type="button"
                    onClick={() => setEditItem({ ...editItem, expiry_date: '' })}
                    className="text-[11px] font-bold text-red-500 hover:text-red-700 underline"
                  >
                    Effacer la date
                  </button>
                )}
              </div>
              <input 
                type="date" 
                value={editItem.expiry_date || ''} 
                onChange={e => setEditItem({...editItem, expiry_date: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400 px-1">
                <span>Affichage : <strong className="text-text-main">{editItem.expiry_date ? formatDisplayDate(editItem.expiry_date) : 'Aucune date'}</strong></span>
                <span className="italic">Format standard : JJ/MM/AAAA</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Identifiant Carton</label>
              <input 
                type="text" 
                value={editItem.box_id || ''} 
                onChange={e => setEditItem({...editItem, box_id: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
                placeholder="Ex: C-01"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Statut</label>
              <select 
                value={editItem.status || 'available'} 
                onChange={e => setEditItem({...editItem, status: e.target.value as any})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
              >
                <option value="available">Disponible</option>
                <option value="consumed">Consommé</option>
              </select>
            </div>
            {/* Batch update option */}
            <div className="md:col-span-2 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl p-4 flex items-start gap-3">
              <input 
                type="checkbox"
                id="applyToLot"
                checked={applyToLot}
                onChange={e => setApplyToLot(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="applyToLot" className="text-xs text-stone-700 dark:text-stone-300 cursor-pointer select-none">
                <span className="font-bold text-blue-700 dark:text-blue-400 block mb-0.5">Appliquer à tous les articles identiques en stock</span>
                Met à jour automatiquement la date de péremption, la catégorie et le carton pour tous les exemplaires de « <strong>{editItem.item_name || 'cet article'}</strong> » encore disponibles dans ce carton.
              </label>
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={() => setShowEdit(null)}
              className="px-6 py-4 font-bold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="button"
              onClick={() => {
                if (showEdit) {
                  setConfirmDelete({ id: showEdit.id, type: 'item' });
                  setShowEdit(null);
                }
              }}
              className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all"
            >
              Supprimer
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
      {/* Consume Item Modal */}
      <Modal 
        isOpen={!!showConsume} 
        onClose={() => setShowConsume(null)}
        title="Consommer"
      >
        <form onSubmit={handleConsumeItem} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Date de consommation</label>
            <input 
              type="date" 
              required
              value={consumeData.date} 
              onChange={e => setConsumeData({...consumeData, date: e.target.value})} 
              className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Maraude (optionnel)</label>
            <select 
              value={consumeData.maraude_event_id} 
              onChange={e => {
                const eventId = e.target.value;
                setConsumeData({...consumeData, maraude_event_id: eventId, maraude_team_id: ''});
              }} 
              className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
            >
              <option value="">Sélectionner une maraude...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  Maraude du {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          {consumeData.maraude_event_id && (
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Équipe (optionnel)</label>
              <select 
                value={consumeData.maraude_team_id} 
                onChange={e => setConsumeData({...consumeData, maraude_team_id: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
              >
                <option value="">Toutes les équipes</option>
                {events.find(e => e.id === parseInt(consumeData.maraude_event_id))?.teams.map(team => (
                  <option key={team.id} value={team.id}>{team.team_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={() => setShowConsume(null)} 
              className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm"
            >
              Confirmer
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Partner Modal */}
      <Modal 
        isOpen={showAddPartner} 
        onClose={() => setShowAddPartner(false)}
        title="Nouveau Partenaire"
      >
        <form onSubmit={handleAddPartner} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Nom du partenaire</label>
              <input 
                required 
                type="text" 
                value={newPartner.name} 
                onChange={e => setNewPartner({...newPartner, name: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
                placeholder="Ex: Monoprix, Donateur Privé..." 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Type</label>
              <select 
                value={newPartner.type} 
                onChange={e => setNewPartner({...newPartner, type: e.target.value as any})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
              >
                <option value="Magasin">Magasin</option>
                <option value="Donateur">Donateur</option>
                <option value="Association">Association</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Contact Référent</label>
              <input 
                type="text" 
                value={newPartner.contact_name || ''} 
                onChange={e => setNewPartner({...newPartner, contact_name: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Email</label>
              <input 
                type="email" 
                value={newPartner.email || ''} 
                onChange={e => setNewPartner({...newPartner, email: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Téléphone</label>
              <input 
                type="tel" 
                value={newPartner.phone || ''} 
                onChange={e => setNewPartner({...newPartner, phone: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Adresse</label>
              <input 
                type="text" 
                value={newPartner.address || ''} 
                onChange={e => setNewPartner({...newPartner, address: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Notes</label>
              <textarea 
                value={newPartner.notes || ''} 
                onChange={e => setNewPartner({...newPartner, notes: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main h-24 resize-none" 
              />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={() => setShowAddPartner(false)}
              className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm"
            >
              Enregistrer le partenaire
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Todo Modal */}
      <Modal 
        isOpen={showAddTodo} 
        onClose={() => setShowAddTodo(false)}
        title="Nouvelle Tâche"
      >
        <form onSubmit={handleAddTodo} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Description de la tâche</label>
            <input 
              required 
              type="text" 
              value={newTodo.task} 
              onChange={e => setNewTodo({...newTodo, task: e.target.value})} 
              className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              placeholder="Ex: Suivi maraude du 15/03..." 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Priorité</label>
              <select 
                value={newTodo.priority} 
                onChange={e => setNewTodo({...newTodo, priority: e.target.value as any})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">Date d'échéance</label>
              <input 
                type="date" 
                value={newTodo.due_date || ''} 
                onChange={e => setNewTodo({...newTodo, due_date: e.target.value})} 
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
              />
            </div>
          </div>
          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={() => setShowAddTodo(false)}
              className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm"
            >
              Ajouter la tâche
            </button>
          </div>
        </form>
      </Modal>

      {/* Threshold Modal */}
      <Modal 
        isOpen={showThresholdModal} 
        onClose={() => setShowThresholdModal(false)}
        title="Définir le Seuil d'Alerte"
      >
        <form onSubmit={handleSaveThreshold} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">
              Quantité minimale (Alerte)
            </label>
            <p className="text-xs text-stone-500 mb-4">
              Pour la catégorie: <span className="font-bold text-text-main">{categories.find(c => c.id === editingThreshold.category_id)?.name}</span>
            </p>
            <input 
              required 
              type="number" 
              min="0"
              value={editingThreshold.min_quantity || 0} 
              onChange={e => setEditingThreshold({...editingThreshold, min_quantity: parseInt(e.target.value)})} 
              className="w-full bg-stone-50 dark:bg-stone-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-green transition-all font-medium text-text-main" 
            />
          </div>
          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={() => setShowThresholdModal(false)}
              className="flex-1 py-4 font-bold text-stone-400 hover:text-stone-600 transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit" 
              className="flex-[2] bg-brand-green text-white py-4 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm"
            >
              Enregistrer le seuil
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Import CSV */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          if (!isImporting) {
            setShowImportModal(false);
            setParsedItems([]);
            setImportFileName('');
          }
        }}
        title="Importer des articles via CSV"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Format Guide Alert / Box */}
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-3xl p-5 md:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200 font-black text-base">
                <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Format attendu pour le fichier CSV</span>
              </div>
              <button 
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-white dark:bg-stone-900 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/50 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-blue-200 dark:border-blue-700 transition-all shrink-0 shadow-sm"
              >
                <Download size={14} />
                <span>Télécharger le modèle CSV</span>
              </button>
            </div>

            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              Le fichier CSV peut utiliser des <strong>points-virgules (;)</strong> ou des <strong>virgules (,)</strong> comme séparateurs. La première ligne doit contenir les en-têtes de colonnes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-stone-700 dark:text-stone-300">
              <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-red inline-block"></span>
                  Article <span className="text-[10px] text-brand-red font-semibold">(Obligatoire)</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">Nom du produit (ex: <em>Lait demi-écrémé</em>, <em>Brosses à dents</em>)</p>
              </div>

              <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Catégorie <span className="text-[10px] text-stone-400 font-normal">(Optionnel)</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">Nom (ex: <em>Alimentaire</em>, <em>Hygiène</em>). Créée automatiquement si inconnue.</p>
              </div>

              <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Quantité <span className="text-[10px] text-stone-400 font-normal">(Optionnel)</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">Nombre d'unités à créer en stock (ex: <em>12</em>, défaut : <em>1</em>)</p>
              </div>

              <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Format & Unité <span className="text-[10px] text-stone-400 font-normal">(Optionnel)</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">Format: <em>1</em>, <em>500</em> / Unité: <em>L</em>, <em>kg</em>, <em>g</em>, <em>ml</em>, <em>Unité</em></p>
              </div>

              <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Date Péremption <span className="text-[10px] text-stone-400 font-normal">(Optionnel)</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">Format <em>YYYY-MM-DD</em> (ex: <em>2026-12-31</em>) ou <em>DD/MM/YYYY</em></p>
              </div>

              <div className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Carton <span className="text-[10px] text-stone-400 font-normal">(Optionnel)</span>
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">Identifiant de carton (ex: <em>C-01</em>, <em>C-12</em> ou <em>01</em>)</p>
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div>
            <label 
              htmlFor="stock-csv-input"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDropFile}
              className={cn(
                "border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                isDragging 
                  ? "border-brand-green bg-emerald-50/50 dark:bg-emerald-950/20" 
                  : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600 bg-stone-50 dark:bg-stone-900/50"
              )}
            >
              <input 
                id="stock-csv-input" 
                type="file" 
                accept=".csv,text/csv" 
                onChange={handleFileChange}
                className="hidden" 
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Upload size={28} />
              </div>
              <p className="font-bold text-stone-900 dark:text-stone-100 text-sm mb-1">
                {importFileName ? (
                  <span className="text-brand-green font-black">Fichier sélectionné : {importFileName}</span>
                ) : (
                  "Cliquez pour choisir un fichier CSV ou glissez-déposez ici"
                )}
              </p>
              <p className="text-xs text-stone-400">
                Fichiers .csv uniquement (séparateurs virgule ou point-virgule)
              </p>
            </label>
          </div>

          {/* Parsed Items Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-text-main">
                    Aperçu des données ({parsedItems.length} ligne{parsedItems.length > 1 ? 's' : ''})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    {parsedItems.filter(i => i.isValid).reduce((sum, item) => sum + item.quantity, 0)} article(s) à créer
                  </span>
                  {parsedItems.some(i => !i.isValid) && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                      {parsedItems.filter(i => !i.isValid).length} ligne(s) invalide(s)
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParsedItems([]);
                    setImportFileName('');
                  }}
                  className="text-xs text-stone-400 hover:text-stone-600 font-bold"
                >
                  Effacer
                </button>
              </div>

              <div className="bg-stone-50 dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Statut</th>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Article</th>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Catégorie</th>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Qté</th>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Format</th>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Péremption</th>
                      <th className="px-4 py-2.5 font-black text-stone-400 uppercase tracking-widest text-[10px]">Carton</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {parsedItems.map((item, idx) => (
                      <tr key={idx} className={item.isValid ? "hover:bg-white dark:hover:bg-stone-800/50" : "bg-red-50/50 dark:bg-red-950/20"}>
                        <td className="px-4 py-2.5">
                          {item.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 size={13} /> Valide
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-[11px]" title={item.error}>
                              <XCircle size={13} /> Erreur
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-stone-900 dark:text-stone-100">
                          {item.item_name || <span className="text-red-500 italic">Non renseigné</span>}
                        </td>
                        <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                          {item.category_name || <span className="text-stone-400 italic">Sans catégorie</span>}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-stone-900 dark:text-stone-100">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                          {item.unit_value} {item.unit_type}
                        </td>
                        <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                          {item.expiry_date ? (
                            <span className="font-mono">{item.expiry_date}</span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-stone-600 dark:text-stone-300">
                          {item.box_id ? (
                            <span className="font-mono bg-stone-200 dark:bg-stone-800 px-2 py-0.5 rounded text-[11px]">{item.box_id}</span>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button 
              type="button" 
              onClick={() => {
                setShowImportModal(false);
                setParsedItems([]);
                setImportFileName('');
              }}
              disabled={isImporting}
              className="flex-1 py-3.5 rounded-2xl font-bold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors border border-stone-200 dark:border-stone-800"
            >
              Annuler
            </button>
            <button 
              type="button" 
              onClick={handleExecuteImport}
              disabled={isImporting || parsedItems.filter(i => i.isValid).length === 0}
              className="flex-[2] bg-brand-green text-white py-3.5 rounded-2xl font-bold hover:bg-brand-green/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Importation en cours...</span>
                </>
              ) : (
                <>
                  <Upload size={18} />
                  <span>
                    Importer {parsedItems.filter(i => i.isValid).reduce((sum, item) => sum + item.quantity, 0)} article(s) dans le stock
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            if (confirmDelete.type === 'item') {
              handleDeleteItem(confirmDelete.id);
            } else {
              handleDeleteCategory(confirmDelete.id);
            }
            setConfirmDelete(null);
          }
        }}
        title={confirmDelete?.type === 'item' ? "Supprimer l'article" : "Supprimer la catégorie"}
        message={confirmDelete?.type === 'item' 
          ? "Voulez-vous vraiment supprimer cet article ? Cette action est irréversible."
          : "Voulez-vous vraiment supprimer cette catégorie ?"}
        confirmText="Supprimer"
        type="danger"
      />
    </div>
  );
};

export default StockPage;
