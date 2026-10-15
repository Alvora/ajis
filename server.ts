import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import bcrypt from "bcrypt";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "./src/db";
import * as schema from "./src/db/schema";
import { eq, and, or, like, desc, asc, inArray, sql, isNull } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  async function calculateUserRights(groups: any[]) {
    const rights: Record<string, string> = {};
    const levels = ['-', 'R', 'RW', 'RWD'];
    const pages = ['Tableau de bord', 'Gestion des stocks', 'Documents', 'Annonces', 'La maraude', 'Les équipes', 'Gestion des tickets', 'Recensement', 'Carte Mutualisée'];
    for (const p of pages) rights[p] = '-';

    if (!groups || groups.length === 0) return rights;

    const groupIds = groups.map(g => g.id);
    const groupRights = await db.select({
      pageName: schema.groupPageRights.pageName,
      rightLevel: schema.groupPageRights.rightLevel,
    })
    .from(schema.groupPageRights)
    .where(sql`${schema.groupPageRights.groupId} IN (${sql.join(groupIds, sql`, `)})`);

    for (const gr of groupRights) {
      if (!gr.pageName || !pages.includes(gr.pageName)) continue;
      const currentLevel = levels.indexOf(rights[gr.pageName]);
      const newLevel = levels.indexOf(gr.rightLevel || '-');
      if (newLevel > currentLevel) {
        rights[gr.pageName] = gr.rightLevel || '-';
      }
    }
    return rights;
  }

  app.get("/api/associations", async (req, res) => {
    try {
      const associationsList = await db.select({
        id: schema.associations.id,
        name: schema.associations.name,
        color: schema.associations.color,
      }).from(schema.associations);
      res.json(associationsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auth Routes
  app.get("/api/dashboard/summary", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      const [stock, reportsResult, eventsResult, announcements, distributionsResult] = await Promise.all([
        db.select().from(schema.stock).where(eq(schema.stock.associationId, parseInt(assoId))),
        db.select().from(schema.reports)
          .innerJoin(schema.maraudeTeams, eq(schema.reports.maraudeTeamId, schema.maraudeTeams.id))
          .innerJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
          .where(eq(schema.maraudeEvents.associationId, parseInt(assoId))),
        db.select().from(schema.maraudeEvents).where(eq(schema.maraudeEvents.associationId, parseInt(assoId))),
        db.select().from(schema.announcements).where(eq(schema.announcements.associationId, parseInt(assoId))),
        db.select().from(schema.distributions)
          .innerJoin(schema.maraudeTeams, eq(schema.distributions.maraudeTeamId, schema.maraudeTeams.id))
          .innerJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
          .where(eq(schema.maraudeEvents.associationId, parseInt(assoId)))
      ]);

      const reports = reportsResult.map(r => r.reports);
      const distributions = distributionsResult.map(r => r.distributions);
      
      // We also need to fetch teams for events because DashboardPage uses it
      const events = await Promise.all(eventsResult.map(async (e) => {
        const teams = await db.select().from(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, e.id));
        return { ...e, teams };
      }));

      res.json({ stock, reports, events, announcements, distributions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    try {
      const userContext = await db.select({
        id: schema.users.id,
        username: schema.users.username,
        password: schema.users.password,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
        title: schema.users.title,
        status: schema.users.status,
        associationId: schema.users.associationId,
        associationName: schema.associations.name,
      })
      .from(schema.users)
      .leftJoin(schema.associations, eq(schema.users.associationId, schema.associations.id))
      .where(eq(schema.users.username, username))
      .then(res => res[0] as any);
      
      if (userContext && bcrypt.compareSync(password, userContext.password)) {
        if (userContext.status === 'pending') {
          return res.status(403).json({ error: "Votre compte est en attente de validation par un administrateur." });
        }

        const userRolesList = await db.select({
          name: schema.roles.name,
        })
        .from(schema.roles)
        .innerJoin(schema.userRoles, eq(schema.roles.id, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, userContext.id));

        userContext.roles = userRolesList.map(r => r.name);
        userContext.role = userContext.roles[0] || 'visitor';
        
        userContext.groups = await db.select({
          id: schema.groups.id,
          name: schema.groups.name,
          color: schema.groups.color,
          description: schema.groups.description,
        })
        .from(schema.groups)
        .innerJoin(schema.roleGroups, eq(schema.groups.id, schema.roleGroups.groupId))
        .innerJoin(schema.userRoles, eq(schema.roleGroups.roleId, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, userContext.id))
        .then(res => Array.from(new Set(res.map(g => JSON.stringify(g)))).map(s => JSON.parse(s)));
        
        userContext.rights = await calculateUserRights(userContext.groups);
        
        userContext.association_id = userContext.associationId;
        userContext.association_name = userContext.associationName;
        userContext.avatar_url = userContext.avatarUrl;

        const { password: _, ...userWithoutPassword } = userContext;
        res.json(userWithoutPassword);
      } else {
        res.status(401).json({ error: "Identifiants invalides" });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/register", async (req, res) => {
    const { username, email, password, associationId } = req.body;
    try {
      // Check if user exists
      const existingUser = await db.select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.username, username))
        .then(res => res[0]);
      
      if (existingUser) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.insert(schema.users).values({
        username,
        email,
        password: hashedPassword,
        title: 'Bénévole',
        status: 'pending',
        associationId: associationId || null,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Groups API
  // API routes go here
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/groups", async (req, res) => {
    try {
      const groupsList = await db.select().from(schema.groups);
      res.json(groupsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/groups", async (req, res) => {
    const { name, color, description } = req.body;
    try {
      await db.insert(schema.groups).values({
        name,
        color,
        description,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/groups/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.groups).where(eq(schema.groups.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/groups/:id", async (req, res) => {
    const { id } = req.params;
    const { name, color, description } = req.body;
    try {
      await db.update(schema.groups)
        .set({ name, color, description })
        .where(eq(schema.groups.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // API Routes
  app.get("/api/users", async (req, res) => {
    try {
      const usersList = await db.select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
        title: schema.users.title,
        status: schema.users.status,
      }).from(schema.users);

      for (const u of usersList as any[]) {
        const roles = await db.select({
          name: schema.roles.name,
        })
        .from(schema.roles)
        .innerJoin(schema.userRoles, eq(schema.roles.id, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, u.id));

        u.roles = roles.map(r => r.name);
        u.role = u.roles[0] || 'visitor';
        
        u.groups = await db.select({
          id: schema.groups.id,
          name: schema.groups.name,
          color: schema.groups.color,
          description: schema.groups.description,
        })
        .from(schema.groups)
        .innerJoin(schema.roleGroups, eq(schema.groups.id, schema.roleGroups.groupId))
        .innerJoin(schema.userRoles, eq(schema.roleGroups.roleId, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, u.id))
        .then(res => Array.from(new Set(res.map(g => JSON.stringify(g)))).map(s => JSON.parse(s)));
        
        u.rights = await calculateUserRights(u.groups);
      }
      res.json(usersList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const user = await db.select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
        title: schema.users.title,
      })
      .from(schema.users)
      .where(eq(schema.users.id, parseInt(id)))
      .then(res => res[0]);

      if (user) {
        const roles = await db.select({
          name: schema.roles.name,
        })
        .from(schema.roles)
        .innerJoin(schema.userRoles, eq(schema.roles.id, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, parseInt(id)));

        (user as any).roles = roles.map(r => r.name);
        (user as any).role = (user as any).roles[0] || 'visitor';
        
        (user as any).groups = await db.select({
          id: schema.groups.id,
          name: schema.groups.name,
          color: schema.groups.color,
          description: schema.groups.description,
        })
        .from(schema.groups)
        .innerJoin(schema.roleGroups, eq(schema.groups.id, schema.roleGroups.groupId))
        .innerJoin(schema.userRoles, eq(schema.roleGroups.roleId, schema.userRoles.roleId))
        .where(eq(schema.userRoles.userId, parseInt(id)))
        .then(res => Array.from(new Set(res.map(g => JSON.stringify(g)))).map(s => JSON.parse(s)));
        
        (user as any).rights = await calculateUserRights((user as any).groups);
        
        res.json(user);
      } else {
        res.status(404).json({ error: "Utilisateur non trouvé" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await db.update(schema.users)
        .set({ status })
        .where(eq(schema.users.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/profile", async (req, res) => {
    const { id } = req.params;
    const { email, avatar_url } = req.body;
    try {
      await db.update(schema.users)
        .set({ email, avatarUrl: avatar_url })
        .where(eq(schema.users.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier téléchargé" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.get("/api/roles", async (req, res) => {
    try {
      const rolesList = await db.select().from(schema.roles);
      res.json(rolesList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/roles", async (req, res) => {
    const { name, description } = req.body;
    try {
      await db.insert(schema.roles).values({ name, description });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/roles/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
      await db.update(schema.roles)
        .set({ name, description })
        .where(eq(schema.roles.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/roles/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.roles).where(eq(schema.roles.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/role-groups", async (req, res) => {
    try {
      const roleGroupsList = await db.select().from(schema.roleGroups);
      res.json(roleGroupsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/role-groups", async (req, res) => {
    const { role_id, group_id } = req.body;
    try {
      await db.insert(schema.roleGroups).values({ roleId: role_id, groupId: group_id });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/role-groups", async (req, res) => {
    const { role_id, group_id } = req.body;
    try {
      await db.delete(schema.roleGroups)
        .where(and(eq(schema.roleGroups.roleId, role_id), eq(schema.roleGroups.groupId, group_id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/group-page-rights", async (req, res) => {
    try {
      const rightsList = await db.select().from(schema.groupPageRights);
      res.json(rightsList);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/group-page-rights", async (req, res) => {
    const { group_id, page_name, right_level } = req.body;
    try {
      await db.insert(schema.groupPageRights)
        .values({
          groupId: group_id,
          pageName: page_name,
          rightLevel: right_level,
        })
        .onConflictDoUpdate({
          target: [schema.groupPageRights.groupId, schema.groupPageRights.pageName],
          set: { rightLevel: right_level },
        });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { username, password, email, roles, title } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const [newUser] = await db.insert(schema.users)
        .values({ username, password: hashedPassword, email, title, status: 'active' })
        .returning({ id: schema.users.id });
      
      if (roles && Array.isArray(roles)) {
        for (const r of roles) {
          const roleObj = await db.select({ id: schema.roles.id })
            .from(schema.roles)
            .where(eq(schema.roles.name, r))
            .then(res => res[0]);
          
          if (roleObj) {
            await db.insert(schema.userRoles).values({
              userId: newUser.id,
              roleId: roleObj.id,
            });
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/details", async (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
      await db.update(schema.users)
        .set({ title })
        .where(eq(schema.users.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/roles", async (req, res) => {
    const { id } = req.params;
    const { roles } = req.body;
    try {
      // Check if it's the last admin/president
      const currentRoles = await db.select({
        name: schema.roles.name,
      })
      .from(schema.roles)
      .innerJoin(schema.userRoles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.userRoles.userId, parseInt(id)));
      
      const roleNames = currentRoles.map(r => r.name);
      const isAdmin = roleNames.includes('Président·e');
      
      if (isAdmin) {
        const presidentRole = await db.select({ id: schema.roles.id })
          .from(schema.roles)
          .where(eq(schema.roles.name, 'Président·e'))
          .then(res => res[0]);

        if (presidentRole) {
          const adminCountResult = await db.select({
            count: sql<number>`count(distinct user_id)`,
          })
          .from(schema.userRoles)
          .where(eq(schema.userRoles.roleId, presidentRole.id))
          .then(res => res[0]);
          
          const willStillBeAdmin = roles.includes('Président·e');
          if (adminCountResult && Number(adminCountResult.count) <= 1 && !willStillBeAdmin) {
            return res.status(400).json({ error: "Impossible de retirer le rôle du dernier Président·e." });
          }
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, parseInt(id)));
        for (const r of roles) {
          const roleObj = await tx.select({ id: schema.roles.id })
            .from(schema.roles)
            .where(eq(schema.roles.name, r))
            .then(res => res[0]);
          
          if (roleObj) {
            await tx.insert(schema.userRoles).values({
              userId: parseInt(id),
              roleId: roleObj.id,
            });
          }
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/users/:id/username", async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    try {
      await db.update(schema.users)
        .set({ username })
        .where(eq(schema.users.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique constraint') || error.message.includes('UNIQUE constraint')) {
        res.status(400).json({ error: "Ce nom d'utilisateur existe déjà." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.patch("/api/users/:id/password", async (req, res) => {
    const { id } = req.params;
    const { password, oldPassword } = req.body;
    try {
      if (oldPassword) {
        const user = await db.select({ password: schema.users.password })
          .from(schema.users)
          .where(eq(schema.users.id, parseInt(id)))
          .then(res => res[0]);
        
        if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
          return res.status(401).json({ error: "L'ancien mot de passe est incorrect." });
        }
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.update(schema.users)
        .set({ password: hashedPassword })
        .where(eq(schema.users.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { username, email, status } = req.body;
    try {
      const updateData: any = { username, email };
      if (status) updateData.status = status;

      await db.update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique constraint') || error.message.includes('UNIQUE constraint')) {
        res.status(400).json({ error: "Ce nom d'utilisateur ou cet email existe déjà." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(id);
    console.log(`[DELETE USER] Attempting to delete user with ID: ${userId}`);
    try {
      const userRolesList = await db.select({
        name: schema.roles.name,
      })
      .from(schema.roles)
      .innerJoin(schema.userRoles, eq(schema.roles.id, schema.userRoles.roleId))
      .where(eq(schema.userRoles.userId, userId));
      
      const roles = userRolesList.map(r => r.name);
      console.log(`[DELETE USER] User roles: ${roles.join(', ')}`);
      
      if (roles.includes('Président·e')) {
        const presidentRole = await db.select({ id: schema.roles.id })
          .from(schema.roles)
          .where(eq(schema.roles.name, 'Président·e'))
          .then(res => res[0]);

        if (presidentRole) {
          const adminCountResult = await db.select({
            count: sql<number>`count(distinct user_id)`,
          })
          .from(schema.userRoles)
          .where(eq(schema.userRoles.roleId, presidentRole.id))
          .then(res => res[0]);
          
          console.log(`[DELETE USER] Admin count: ${adminCountResult?.count}`);
          if (adminCountResult && Number(adminCountResult.count) <= 1) {
            console.log(`[DELETE USER] Blocked: Cannot delete last Président·e`);
            return res.status(400).json({ error: "Impossible de supprimer le dernier Président·e." });
          }
        }
      }

      await db.transaction(async (tx) => {
        console.log(`[DELETE USER] Starting transaction for user ${userId}`);
        
        await tx.delete(schema.userRoles).where(eq(schema.userRoles.userId, userId));
        await tx.delete(schema.registrations).where(eq(schema.registrations.userId, userId));
        await tx.delete(schema.reports).where(eq(schema.reports.userId, userId));
        await tx.delete(schema.tickets).where(eq(schema.tickets.userId, userId));
        await tx.update(schema.circuits).set({ createdBy: null }).where(eq(schema.circuits.createdBy, userId));
        await tx.delete(schema.users).where(eq(schema.users.id, userId));
        
        console.log(`[DELETE USER] Deleted user record and dependencies.`);
      });
      console.log(`[DELETE USER] Transaction committed successfully`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`[DELETE USER] Error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  const formatStockItem = (s: any) => ({
    id: s.id,
    item_name: s.itemName ?? s.item_name ?? '',
    itemName: s.itemName ?? s.item_name ?? '',
    quantity: s.quantity ?? 1,
    unit_type: s.unitType ?? s.unit_type ?? 'Unité',
    unitType: s.unitType ?? s.unit_type ?? 'Unité',
    unit_value: s.unitValue ?? s.unit_value ?? 1,
    unitValue: s.unitValue ?? s.unit_value ?? 1,
    category_id: s.categoryId ?? s.category_id ?? null,
    categoryId: s.categoryId ?? s.category_id ?? null,
    status: s.status ?? 'available',
    expiry_date: s.expiryDate ?? s.expiry_date ?? null,
    expiryDate: s.expiryDate ?? s.expiry_date ?? null,
    box_id: s.boxId ?? s.box_id ?? null,
    boxId: s.boxId ?? s.box_id ?? null,
    created_at: s.createdAt ?? s.created_at ?? null,
    createdAt: s.createdAt ?? s.created_at ?? null,
    consumed_at: s.consumedAt ?? s.consumed_at ?? null,
    consumedAt: s.consumedAt ?? s.consumed_at ?? null,
    association_id: s.associationId ?? s.association_id ?? null,
    associationId: s.associationId ?? s.association_id ?? null,
    maraude_event_id: s.maraudeEventId ?? s.maraude_event_id ?? null,
    maraudeEventId: s.maraudeEventId ?? s.maraude_event_id ?? null,
    maraude_team_id: s.maraudeTeamId ?? s.maraude_team_id ?? null,
    maraudeTeamId: s.maraudeTeamId ?? s.maraude_team_id ?? null,
    category_name: s.categoryName ?? s.category_name ?? 'Sans catégorie',
    categoryName: s.categoryName ?? s.category_name ?? 'Sans catégorie',
    category_color: s.categoryColor ?? s.category_color ?? '#94a3b8',
    categoryColor: s.categoryColor ?? s.category_color ?? '#94a3b8',
    maraude_event_title: s.maraudeEventDate ?? s.maraudeEventTitle ?? s.maraude_event_title ?? '',
    maraudeEventTitle: s.maraudeEventDate ?? s.maraudeEventTitle ?? s.maraude_event_title ?? '',
    maraude_team_name: s.maraudeTeamName ?? s.maraude_team_name ?? '',
    maraudeTeamName: s.maraudeTeamName ?? s.maraude_team_name ?? '',
  });

  const formatStockHistory = (h: any) => ({
    id: h.id,
    stock_id: h.stockId ?? h.stock_id,
    stockId: h.stockId ?? h.stock_id,
    change_amount: h.changeAmount ?? h.change_amount ?? 1,
    changeAmount: h.changeAmount ?? h.change_amount ?? 1,
    type: h.type,
    reason: h.reason,
    maraude_event_id: h.maraudeEventId ?? h.maraude_event_id ?? null,
    maraudeEventId: h.maraudeEventId ?? h.maraude_event_id ?? null,
    maraude_team_id: h.maraudeTeamId ?? h.maraude_team_id ?? null,
    maraudeTeamId: h.maraudeTeamId ?? h.maraude_team_id ?? null,
    item_name: h.itemName ?? h.item_name ?? '',
    itemName: h.itemName ?? h.item_name ?? '',
    category_name: h.categoryName ?? h.category_name ?? '',
    categoryName: h.categoryName ?? h.category_name ?? '',
    maraude_date: h.maraudeDate ?? h.maraude_date ?? '',
    maraudeDate: h.maraudeDate ?? h.maraude_date ?? '',
    maraude_event_title: h.maraudeEventTitle ?? h.maraude_event_title ?? '',
    maraudeEventTitle: h.maraudeEventTitle ?? h.maraude_event_title ?? '',
    maraude_team_name: h.maraudeTeamName ?? h.maraude_team_name ?? '',
    maraudeTeamName: h.maraudeTeamName ?? h.maraude_team_name ?? '',
    timestamp: h.timestamp,
  });

  const formatStockTodo = (t: any) => ({
    id: t.id,
    task: t.task,
    is_completed: typeof t.isCompleted === 'number' ? t.isCompleted === 1 : Boolean(t.isCompleted ?? t.is_completed),
    isCompleted: typeof t.isCompleted === 'number' ? t.isCompleted === 1 : Boolean(t.isCompleted ?? t.is_completed),
    priority: t.priority ?? 'medium',
    due_date: t.dueDate ?? t.due_date ?? null,
    dueDate: t.dueDate ?? t.due_date ?? null,
    created_at: t.createdAt ?? t.created_at ?? null,
    createdAt: t.createdAt ?? t.created_at ?? null,
    association_id: t.associationId ?? t.association_id ?? null,
    associationId: t.associationId ?? t.association_id ?? null,
  });

  const formatStockPartner = (p: any) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    contact_name: p.contactName ?? p.contact_name ?? '',
    contactName: p.contactName ?? p.contact_name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    address: p.address ?? '',
    notes: p.notes ?? '',
    created_at: p.createdAt ?? p.created_at ?? null,
    createdAt: p.createdAt ?? p.created_at ?? null,
  });

  const formatStockThreshold = (th: any) => ({
    id: th.id,
    category_id: th.categoryId ?? th.category_id,
    categoryId: th.categoryId ?? th.category_id,
    min_quantity: th.minQuantity ?? th.min_quantity ?? 0,
    minQuantity: th.minQuantity ?? th.min_quantity ?? 0,
  });

  app.get("/api/stock/dashboard-summary", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    const parsedAssoId = assoId ? parseInt(assoId) : null;
    const validAssoId = parsedAssoId && !isNaN(parsedAssoId) ? parsedAssoId : null;

    try {
      const stockQuery = db.select({
        id: schema.stock.id,
        itemName: schema.stock.itemName,
        quantity: schema.stock.quantity,
        unitType: schema.stock.unitType,
        unitValue: schema.stock.unitValue,
        categoryId: schema.stock.categoryId,
        status: schema.stock.status,
        expiryDate: schema.stock.expiryDate,
        boxId: schema.stock.boxId,
        createdAt: schema.stock.createdAt,
        consumedAt: schema.stock.consumedAt,
        associationId: schema.stock.associationId,
        maraudeEventId: schema.stock.maraudeEventId,
        maraudeTeamId: schema.stock.maraudeTeamId,
        categoryName: schema.stockCategories.name,
        categoryColor: schema.stockCategories.color,
        maraudeEventDate: schema.maraudeEvents.date,
        maraudeTeamName: schema.maraudeTeams.teamName
      })
      .from(schema.stock)
      .leftJoin(schema.stockCategories, eq(schema.stock.categoryId, schema.stockCategories.id))
      .leftJoin(schema.maraudeEvents, eq(schema.stock.maraudeEventId, schema.maraudeEvents.id))
      .leftJoin(schema.maraudeTeams, eq(schema.stock.maraudeTeamId, schema.maraudeTeams.id));

      const historyQuery = db.select({
        id: schema.stockHistory.id,
        stockId: schema.stockHistory.stockId,
        changeAmount: schema.stockHistory.changeAmount,
        type: schema.stockHistory.type,
        reason: schema.stockHistory.reason,
        maraudeEventId: schema.stockHistory.maraudeEventId,
        maraudeTeamId: schema.stockHistory.maraudeTeamId,
        timestamp: schema.stockHistory.timestamp
      })
      .from(schema.stockHistory)
      .innerJoin(schema.stock, eq(schema.stockHistory.stockId, schema.stock.id));

      const thresholdsQuery = db.select({
        id: schema.stockThresholds.id,
        categoryId: schema.stockThresholds.categoryId,
        minQuantity: schema.stockThresholds.minQuantity
      })
      .from(schema.stockThresholds)
      .innerJoin(schema.stockCategories, eq(schema.stockThresholds.categoryId, schema.stockCategories.id));

      const [stock, history, categories, events, partners, todos, thresholds] = await Promise.all([
        validAssoId ? stockQuery.where(eq(schema.stock.associationId, validAssoId)) : stockQuery,
        validAssoId ? historyQuery.where(eq(schema.stock.associationId, validAssoId)) : historyQuery,
        validAssoId
          ? db.select().from(schema.stockCategories).where(or(eq(schema.stockCategories.associationId, validAssoId), isNull(schema.stockCategories.associationId)))
          : db.select().from(schema.stockCategories),
        validAssoId
          ? db.select().from(schema.maraudeEvents).where(eq(schema.maraudeEvents.associationId, validAssoId))
          : db.select().from(schema.maraudeEvents),
        validAssoId
          ? db.select().from(schema.stockPartners).where(or(eq(schema.stockPartners.associationId, validAssoId), isNull(schema.stockPartners.associationId)))
          : db.select().from(schema.stockPartners),
        validAssoId
          ? db.select().from(schema.stockTodos).where(or(eq(schema.stockTodos.associationId, validAssoId), isNull(schema.stockTodos.associationId)))
          : db.select().from(schema.stockTodos),
        validAssoId
          ? thresholdsQuery.where(or(eq(schema.stockCategories.associationId, validAssoId), isNull(schema.stockCategories.associationId)))
          : thresholdsQuery
      ]);

      res.json({ 
        stock: (stock as any[]).map(formatStockItem), 
        history: (history as any[]).map(formatStockHistory), 
        categories, 
        events, 
        partners: (partners as any[]).map(formatStockPartner), 
        todos: (todos as any[]).map(formatStockTodo), 
        thresholds: (thresholds as any[]).map(formatStockThreshold) 
      });
    } catch (error: any) {
      console.error("Error in /api/stock/dashboard-summary:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    const parsedAssoId = assoId ? parseInt(assoId) : null;
    const validAssoId = parsedAssoId && !isNaN(parsedAssoId) ? parsedAssoId : null;
    try {
      const query = db.select({
        id: schema.stock.id,
        itemName: schema.stock.itemName,
        quantity: schema.stock.quantity,
        unitType: schema.stock.unitType,
        unitValue: schema.stock.unitValue,
        categoryId: schema.stock.categoryId,
        expiryDate: schema.stock.expiryDate,
        boxId: schema.stock.boxId,
        associationId: schema.stock.associationId,
        status: schema.stock.status,
        consumedAt: schema.stock.consumedAt,
        createdAt: schema.stock.createdAt,
        categoryName: schema.stockCategories.name,
        categoryColor: schema.stockCategories.color,
        maraudeEventTitle: schema.maraudeEvents.date,
        maraudeTeamName: schema.maraudeTeams.teamName,
      })
      .from(schema.stock)
      .leftJoin(schema.stockCategories, eq(schema.stock.categoryId, schema.stockCategories.id))
      .leftJoin(schema.maraudeEvents, eq(schema.stock.maraudeEventId, schema.maraudeEvents.id))
      .leftJoin(schema.maraudeTeams, eq(schema.stock.maraudeTeamId, schema.maraudeTeams.id));

      let items;
      if (validAssoId) {
        items = await query.where(eq(schema.stock.associationId, validAssoId)).orderBy(desc(schema.stock.createdAt));
      } else {
        items = await query.orderBy(desc(schema.stock.createdAt));
      }
      res.json(items.map(formatStockItem));
    } catch (error: any) {
      console.error("Error fetching stock:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock", async (req, res) => {
    const { item_name, quantity, unit_type, unit_value, category_id, expiry_date, box_id } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    const count = parseInt(quantity) || 1;
    
    try {
      const lastId = await db.transaction(async (tx) => {
        let currentId;
        for (let i = 0; i < count; i++) {
          const [result] = await tx.insert(schema.stock).values({
            itemName: item_name,
            quantity: 1,
            unitType: unit_type,
            unitValue: unit_value,
            categoryId: category_id,
            expiryDate: expiry_date,
            boxId: box_id || null,
            associationId: assoId ? parseInt(assoId) : null,
          }).returning({ id: schema.stock.id });
          
          await tx.insert(schema.stockHistory).values({
            stockId: result.id,
            changeAmount: 1,
            type: 'addition',
            reason: 'manual',
          });
          
          currentId = result.id;
        }
        return currentId;
      });

      res.json({ success: true, id: lastId });
    } catch (error: any) {
      console.error("Error creating stock items:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock/bulk-import", async (req, res) => {
    const { items } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    const parsedAssoId = assoId ? parseInt(assoId) : null;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Aucun article à importer" });
    }

    const defaultColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

    try {
      const result = await db.transaction(async (tx) => {
        const existingCategories = await tx.select().from(schema.stockCategories);
        const categoryMap = new Map<string, number>();
        existingCategories.forEach(c => {
          categoryMap.set(c.name.trim().toLowerCase(), c.id);
        });

        let newCategoriesCount = 0;
        let totalItemsCreated = 0;

        for (const rawItem of items) {
          const itemName = (rawItem.item_name || rawItem.name || '').trim();
          if (!itemName) continue;

          let categoryId: number | null = rawItem.category_id ? parseInt(rawItem.category_id) : null;
          const categoryName = (rawItem.category_name || rawItem.category || '').trim();

          if (!categoryId && categoryName) {
            const lowerCat = categoryName.toLowerCase();
            if (categoryMap.has(lowerCat)) {
              categoryId = categoryMap.get(lowerCat)!;
            } else {
              const color = defaultColors[newCategoriesCount % defaultColors.length];
              const [newCat] = await tx.insert(schema.stockCategories).values({
                name: categoryName,
                color,
                associationId: parsedAssoId
              }).returning({ id: schema.stockCategories.id });
              
              categoryId = newCat.id;
              categoryMap.set(lowerCat, newCat.id);
              newCategoriesCount++;
            }
          }

          const quantity = Math.max(1, parseInt(rawItem.quantity) || 1);
          const unitType = rawItem.unit_type || 'Unité';
          const unitValue = parseFloat(rawItem.unit_value) || 1;
          const expiryDate = rawItem.expiry_date ? String(rawItem.expiry_date).trim() : null;
          let boxId = rawItem.box_id ? String(rawItem.box_id).trim() : null;
          if (boxId && !boxId.startsWith('C-')) {
            boxId = `C-${boxId}`;
          }

          for (let i = 0; i < quantity; i++) {
            const [inserted] = await tx.insert(schema.stock).values({
              itemName,
              quantity: 1,
              unitType,
              unitValue,
              categoryId,
              expiryDate: expiryDate || null,
              boxId: boxId || null,
              associationId: parsedAssoId,
            }).returning({ id: schema.stock.id });

            await tx.insert(schema.stockHistory).values({
              stockId: inserted.id,
              changeAmount: 1,
              type: 'addition',
              reason: 'import_csv',
            });

            totalItemsCreated++;
          }
        }

        return { totalItemsCreated, newCategoriesCount };
      });

      res.json({
        success: true,
        count: result.totalItemsCreated,
        categories_created: result.newCategoriesCount
      });
    } catch (error: any) {
      console.error("Error during bulk import of stock:", error);
      res.status(500).json({ error: error.message || "Erreur lors de l'importation du stock" });
    }
  });

  app.post("/api/stock/consume", async (req, res) => {
    const { stock_id, quantity, maraude_event_id, maraude_team_id, date } = req.body;
    
    const eventId = maraude_event_id === "" ? null : maraude_event_id;
    const teamId = maraude_team_id === "" ? null : maraude_team_id;

    try {
      await db.transaction(async (tx) => {
        const [item] = await tx.select({ quantity: schema.stock.quantity })
          .from(schema.stock)
          .where(eq(schema.stock.id, stock_id));
          
        if (!item || (item.quantity || 0) < quantity) {
          throw new Error("Quantité insuffisante en stock");
        }

        const newQuantity = (item.quantity || 0) - quantity;
        const status = newQuantity === 0 ? 'consumed' : 'available';
        const consumed_at = date || new Date().toISOString();

        await tx.update(schema.stock)
          .set({
            quantity: newQuantity,
            status: status,
            consumedAt: consumed_at,
            maraudeEventId: eventId,
            maraudeTeamId: teamId,
          })
          .where(eq(schema.stock.id, stock_id));
        
        await tx.insert(schema.stockHistory).values({
          stockId: stock_id,
          changeAmount: quantity,
          type: 'consumption',
          reason: 'maraude',
          maraudeEventId: eventId,
          maraudeTeamId: teamId,
          timestamp: consumed_at,
        });
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock/event/:eventId", async (req, res) => {
    const { eventId } = req.params;
    try {
      const items = await db.select({
        id: schema.stock.id,
        itemName: schema.stock.itemName,
        quantity: schema.stock.quantity,
        unitType: schema.stock.unitType,
        unitValue: schema.stock.unitValue,
        categoryId: schema.stock.categoryId,
        expiryDate: schema.stock.expiryDate,
        boxId: schema.stock.boxId,
        associationId: schema.stock.associationId,
        status: schema.stock.status,
        consumedAt: schema.stock.consumedAt,
        createdAt: schema.stock.createdAt,
        categoryName: schema.stockCategories.name,
        categoryColor: schema.stockCategories.color,
        maraudeEventTitle: schema.maraudeEvents.date,
      })
      .from(schema.stock)
      .leftJoin(schema.stockCategories, eq(schema.stock.categoryId, schema.stockCategories.id))
      .leftJoin(schema.maraudeEvents, eq(schema.stock.maraudeEventId, schema.maraudeEvents.id))
      .where(eq(schema.stock.maraudeEventId, parseInt(eventId)));
      
      res.json(items.map(formatStockItem));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock/team/:teamId", async (req, res) => {
    const { teamId } = req.params;
    try {
      const items = await db.select({
        id: schema.stock.id,
        itemName: schema.stock.itemName,
        quantity: schema.stock.quantity,
        unitType: schema.stock.unitType,
        unitValue: schema.stock.unitValue,
        categoryId: schema.stock.categoryId,
        expiryDate: schema.stock.expiryDate,
        boxId: schema.stock.boxId,
        associationId: schema.stock.associationId,
        status: schema.stock.status,
        consumedAt: schema.stock.consumedAt,
        createdAt: schema.stock.createdAt,
        categoryName: schema.stockCategories.name,
        categoryColor: schema.stockCategories.color,
        maraudeEventTitle: schema.maraudeEvents.date,
        maraudeTeamName: schema.maraudeTeams.teamName,
      })
      .from(schema.stock)
      .leftJoin(schema.stockCategories, eq(schema.stock.categoryId, schema.stockCategories.id))
      .leftJoin(schema.maraudeTeams, eq(schema.stock.maraudeTeamId, schema.maraudeTeams.id))
      .leftJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
      .where(eq(schema.stock.maraudeTeamId, parseInt(teamId)));
      
      res.json(items.map(formatStockItem));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock/return", async (req, res) => {
    const { stock_id } = req.body;
    try {
      await db.transaction(async (tx) => {
        const item = await tx.select().from(schema.stock).where(eq(schema.stock.id, stock_id)).then(res => res[0]);
        if (!item) throw new Error("Article non trouvé");
        
        await tx.update(schema.stock)
          .set({
            quantity: 1,
            status: 'available',
            consumedAt: null,
            maraudeEventId: null,
            maraudeTeamId: null,
          })
          .where(eq(schema.stock.id, stock_id));
        
        await tx.insert(schema.stockHistory).values({
          stockId: stock_id,
          changeAmount: 1,
          type: 'addition',
          reason: 'return_from_maraude',
          timestamp: new Date(),
        });
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock/history", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      const query = db.select({
        id: schema.stockHistory.id,
        stockId: schema.stockHistory.stockId,
        changeAmount: schema.stockHistory.changeAmount,
        type: schema.stockHistory.type,
        reason: schema.stockHistory.reason,
        maraudeEventId: schema.stockHistory.maraudeEventId,
        maraudeTeamId: schema.stockHistory.maraudeTeamId,
        timestamp: schema.stockHistory.timestamp,
        itemName: schema.stock.itemName,
        categoryName: schema.stockCategories.name,
        maraudeDate: schema.maraudeEvents.date,
        maraudeEventTitle: schema.maraudeEvents.date,
        maraudeTeamName: schema.maraudeTeams.teamName,
      })
      .from(schema.stockHistory)
      .innerJoin(schema.stock, eq(schema.stockHistory.stockId, schema.stock.id))
      .leftJoin(schema.stockCategories, eq(schema.stock.categoryId, schema.stockCategories.id))
      .leftJoin(schema.maraudeEvents, eq(schema.stockHistory.maraudeEventId, schema.maraudeEvents.id))
      .leftJoin(schema.maraudeTeams, eq(schema.stockHistory.maraudeTeamId, schema.maraudeTeams.id));

      let history;
      if (assoId) {
        history = await query.where(eq(schema.stock.associationId, parseInt(assoId))).orderBy(desc(schema.stockHistory.timestamp));
      } else {
        history = await query.orderBy(desc(schema.stockHistory.timestamp));
      }
      res.json(history.map(formatStockHistory));
    } catch (error: any) {
      console.error("Error fetching stock history:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stock/categories", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let categories;
      if (assoId) {
        categories = await db.select().from(schema.stockCategories)
          .where(or(eq(schema.stockCategories.associationId, parseInt(assoId)), isNull(schema.stockCategories.associationId)));
      } else {
        categories = await db.select().from(schema.stockCategories);
      }
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock/categories", async (req, res) => {
    const { name, color } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    try {
      const [result] = await db.insert(schema.stockCategories)
        .values({ name, color, associationId: assoId ? parseInt(assoId) : null })
        .returning({ id: schema.stockCategories.id });
      res.json({ success: true, id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/stock/categories/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.stockCategories).where(eq(schema.stockCategories.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Partners
  app.get("/api/stock/partners", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let partners;
      if (assoId) {
        partners = await db.select().from(schema.stockPartners)
          // Note: added associationId to stockPartners in schema
          .orderBy(asc(schema.stockPartners.name));
      } else {
        partners = await db.select().from(schema.stockPartners).orderBy(asc(schema.stockPartners.name));
      }
      res.json(partners.map(formatStockPartner));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock/partners", async (req, res) => {
    const { name, type, contact_name, email, phone, address, notes } = req.body;
    // const assoId = req.headers['x-association-id'];
    try {
      const [result] = await db.insert(schema.stockPartners).values({
        name,
        type,
        contactName: contact_name,
        email,
        phone,
        address,
        notes,
      }).returning({ id: schema.stockPartners.id });
      res.json({ id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/stock/partners/:id", async (req, res) => {
    try {
      await db.delete(schema.stockPartners).where(eq(schema.stockPartners.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Todos
  app.get("/api/stock/todos", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let todos;
      if (assoId) {
        todos = await db.select().from(schema.stockTodos)
          .where(eq(schema.stockTodos.associationId, parseInt(assoId)))
          .orderBy(desc(schema.stockTodos.createdAt));
      } else {
        todos = await db.select().from(schema.stockTodos).orderBy(desc(schema.stockTodos.createdAt));
      }
      res.json(todos.map(formatStockTodo));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock/todos", async (req, res) => {
    const { task, priority, due_date } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    try {
      const [result] = await db.insert(schema.stockTodos).values({
        task,
        priority,
        dueDate: due_date,
        associationId: assoId ? parseInt(assoId) : null,
      }).returning({ id: schema.stockTodos.id });
      res.json({ id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/stock/todos/:id", async (req, res) => {
    const { is_completed } = req.body;
    try {
      await db.update(schema.stockTodos)
        .set({ isCompleted: is_completed ? 1 : 0 })
        .where(eq(schema.stockTodos.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/stock/todos/:id", async (req, res) => {
    try {
      await db.delete(schema.stockTodos).where(eq(schema.stockTodos.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Thresholds
  app.get("/api/stock/thresholds", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let thresholds;
      if (assoId) {
        thresholds = await db.select({
          id: schema.stockThresholds.id,
          categoryId: schema.stockThresholds.categoryId,
          minQuantity: schema.stockThresholds.minQuantity,
        })
        .from(schema.stockThresholds)
        .innerJoin(schema.stockCategories, eq(schema.stockThresholds.categoryId, schema.stockCategories.id))
        .where(or(eq(schema.stockCategories.associationId, parseInt(assoId)), isNull(schema.stockCategories.associationId)));
      } else {
        thresholds = await db.select().from(schema.stockThresholds);
      }
      res.json(thresholds.map(formatStockThreshold));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stock/thresholds", async (req, res) => {
    const { category_id, min_quantity } = req.body;
    try {
      const [result] = await db.insert(schema.stockThresholds)
        .values({ categoryId: category_id, minQuantity: min_quantity })
        .onConflictDoUpdate({
          target: schema.stockThresholds.categoryId,
          set: { minQuantity: min_quantity },
        })
        .returning({ id: schema.stockThresholds.id });
      res.json({ id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/gallery", async (req, res) => {
    try {
      const images = await db.select().from(schema.galleryImages).orderBy(desc(schema.galleryImages.createdAt));
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    const { url, caption } = req.body;
    try {
      const [result] = await db.insert(schema.galleryImages).values({ url, caption }).returning({ id: schema.galleryImages.id });
      res.json({ success: true, id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.galleryImages).where(eq(schema.galleryImages.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/circuits", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let circuitsList;
      if (assoId) {
        circuitsList = await db.select().from(schema.circuits).where(eq(schema.circuits.associationId, parseInt(assoId)));
      } else {
        circuitsList = await db.select().from(schema.circuits);
      }
      res.json(circuitsList.map((c: any) => ({ ...c, path_data: c.pathData ? JSON.parse(c.pathData) : [] })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/circuits", async (req, res) => {
    const { name, path_data, color, created_by } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    try {
      await db.insert(schema.circuits).values({
        name,
        pathData: JSON.stringify(path_data),
        color,
        createdBy: created_by,
        associationId: assoId ? parseInt(assoId) : null,
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

const mapEventToSnakeCase = (e: any, teams: any[], prepRegistrations?: any[]) => ({
  id: e.id,
  date: e.date,
  status: e.status,
  association_id: e.associationId,
  prep_location: e.prepLocation,
  prep_time: e.prepTime,
  start_location: e.startLocation,
  start_time: e.startTime,
  prep_lat: e.prepLat,
  prep_lng: e.prepLng,
  start_lat: e.startLat,
  start_lng: e.startLng,
  prep_description: e.prepDescription,
  info_document_url: e.infoDocumentUrl,
  meals_prepared: e.mealsPrepared,
  meals_description: e.mealsDescription,
  created_at: e.createdAt,
  teams: teams.map((t: any) => ({
    id: t.id,
    event_id: t.eventId,
    team_name: t.teamName,
    path_data: typeof t.pathData === 'string' ? JSON.parse(t.pathData) : (t.pathData || []),
    color: t.color,
    path_type: t.pathType
  })),
  ...(prepRegistrations ? { prep_registrations: prepRegistrations } : {})
});

  app.get("/api/maraude/dashboard-summary", async (req, res) => {
    const assoIdStr = req.headers['x-association-id'] as string;
    const assoId = parseInt(assoIdStr);
    const hasAsso = !isNaN(assoId);

    try {
      const [eventsResult, distributionsResult, registrationsResult, reportsResult, categories, beneficiaries, associations] = await Promise.all([
        db.select().from(schema.maraudeEvents).orderBy(desc(schema.maraudeEvents.date)),
        db.select({
          id: schema.distributions.id,
          lat: schema.distributions.lat,
          lng: schema.distributions.lng,
          peopleHelped: schema.distributions.peopleHelped,
          maraudeTeamId: schema.distributions.maraudeTeamId,
          status: schema.distributions.status,
          mobileMealsDelivered: schema.distributions.mobileMealsDelivered,
          createdAt: schema.distributions.createdAt,
          associationId: schema.maraudeEvents.associationId,
          maraudeEventId: schema.maraudeTeams.eventId,
          directHelpCount: sql<number>`(SELECT COUNT(*) FROM distribution_beneficiaries WHERE distribution_id = ${schema.distributions.id} AND direct_help = true)`,
          mobileMealCount: sql<number>`(SELECT COUNT(*) FROM distribution_beneficiaries WHERE distribution_id = ${schema.distributions.id} AND mobile_meal = true)`,
          totalHelpedCount: sql<number>`(SELECT COUNT(*) FROM distribution_beneficiaries WHERE distribution_id = ${schema.distributions.id} AND (direct_help = true OR mobile_meal = true))`,
        })
        .from(schema.distributions)
        .leftJoin(schema.maraudeTeams, eq(schema.distributions.maraudeTeamId, schema.maraudeTeams.id))
        .leftJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id)),
        db.select({
          id: schema.registrations.id,
          maraudeTeamId: schema.registrations.maraudeTeamId,
          userId: schema.registrations.userId,
          isLeader: schema.registrations.isLeader,
          date: schema.registrations.date,
          username: schema.users.username,
        })
        .from(schema.registrations)
        .innerJoin(schema.users, eq(schema.registrations.userId, schema.users.id)),
        db.select({
          id: schema.reports.id,
          maraudeTeamId: schema.reports.maraudeTeamId,
          date: schema.reports.date,
          content: schema.reports.content,
          author: schema.reports.author,
          peopleHelped: schema.reports.peopleHelped,
          createdAt: schema.reports.createdAt,
        })
        .from(schema.reports)
        .orderBy(desc(schema.reports.date)),
        hasAsso ? db.select().from(schema.stockCategories).where(eq(schema.stockCategories.associationId, assoId)) : db.select().from(schema.stockCategories),
        hasAsso ? db.select().from(schema.beneficiaries).where(eq(schema.beneficiaries.associationId, assoId)) : db.select().from(schema.beneficiaries),
        db.select().from(schema.associations)
      ]);

      const events = await Promise.all(eventsResult.map(async (e) => {
        const teams = await db.select().from(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, e.id));
        const prepRegistrations = await db.select({
          id: schema.prepRegistrations.id,
          maraudeEventId: schema.prepRegistrations.maraudeEventId,
          userId: schema.prepRegistrations.userId,
          date: schema.prepRegistrations.date,
          username: schema.users.username,
        })
        .from(schema.prepRegistrations)
        .innerJoin(schema.users, eq(schema.prepRegistrations.userId, schema.users.id))
        .where(eq(schema.prepRegistrations.maraudeEventId, e.id));
        
        const mappedPrep = prepRegistrations.map((pr: any) => ({
          id: pr.id,
          maraude_event_id: pr.maraudeEventId,
          user_id: pr.userId,
          username: pr.username,
          date: pr.date
        }));

        return mapEventToSnakeCase(e, teams, mappedPrep);
      }));

      const distributions = distributionsResult.map((d: any) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        people_helped: d.peopleHelped ?? 1,
        maraude_team_id: d.maraudeTeamId,
        status: d.status,
        mobile_meals_delivered: d.mobileMealsDelivered,
        created_at: d.createdAt,
        association_id: d.associationId,
        maraude_event_id: d.maraudeEventId,
        direct_help_count: d.directHelpCount ? Number(d.directHelpCount) : 0,
        mobile_meal_count: d.mobileMealCount ? Number(d.mobileMealCount) : 0,
        total_helped_count: d.totalHelpedCount ? Number(d.totalHelpedCount) : 0,
      }));

      const registrations = registrationsResult.map((r: any) => ({
        id: r.id,
        maraude_team_id: r.maraudeTeamId,
        user_id: r.userId,
        username: r.username,
        is_leader: r.isLeader ?? 0,
        date: r.date
      }));

      const reports = reportsResult.map((rep: any) => ({
        id: rep.id,
        maraude_team_id: rep.maraudeTeamId,
        date: rep.date,
        content: rep.content,
        author: rep.author,
        people_helped: rep.peopleHelped,
        created_at: rep.createdAt
      }));

      res.json({ events, distributions, registrations, reports, categories, beneficiaries, associations });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maraude-events", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    const fetchAll = req.query.all === 'true';
    
    try {
      let events;
      if (assoId && !fetchAll) {
        events = await db.select().from(schema.maraudeEvents)
          .where(eq(schema.maraudeEvents.associationId, parseInt(assoId)))
          .orderBy(desc(schema.maraudeEvents.date));
      } else {
        events = await db.select().from(schema.maraudeEvents).orderBy(desc(schema.maraudeEvents.date));
      }
      
      const result = [];
      for (const e of events) {
        const teams = await db.select().from(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, e.id));
        const prepRegistrations = await db.select({
          id: schema.prepRegistrations.id,
          maraudeEventId: schema.prepRegistrations.maraudeEventId,
          userId: schema.prepRegistrations.userId,
          date: schema.prepRegistrations.date,
          username: schema.users.username,
        })
        .from(schema.prepRegistrations)
        .innerJoin(schema.users, eq(schema.prepRegistrations.userId, schema.users.id))
        .where(eq(schema.prepRegistrations.maraudeEventId, e.id));
        
        result.push(mapEventToSnakeCase(e, teams, prepRegistrations));
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maraude-events", async (req, res) => {
    const { 
      date, 
      teams, 
      prep_location, 
      prep_time, 
      start_location, 
      start_time, 
      prep_lat, 
      prep_lng, 
      start_lat, 
      start_lng,
      prep_description,
      info_document_url
    } = req.body;
    
    const assoId = req.headers['x-association-id'] as string;
    
    try {
      const eventId = await db.transaction(async (tx) => {
        const [result] = await tx.insert(schema.maraudeEvents).values({
          date,
          associationId: req.body.association_id ? parseInt(req.body.association_id) : (assoId ? parseInt(assoId) : null),
          prepLocation: prep_location ?? null,
          prepTime: prep_time ?? null,
          startLocation: start_location ?? null,
          startTime: start_time ?? null,
          prepLat: prep_lat ?? null,
          prepLng: prep_lng ?? null,
          startLat: start_lat ?? null,
          startLng: start_lng ?? null,
          prepDescription: prep_description ?? null,
          infoDocumentUrl: info_document_url ?? null
        }).returning({ id: schema.maraudeEvents.id });
        
        if (teams && Array.isArray(teams)) {
          for (const team of teams) {
            let pathRaw = typeof team.path_data === 'string' ? JSON.parse(team.path_data) : team.path_data;
            let pathData = Array.isArray(pathRaw) ? [...pathRaw] : [];
            await tx.insert(schema.maraudeTeams).values({
              eventId: result.id,
              teamName: team.team_name,
              pathData: JSON.stringify(pathData),
              color: team.color,
              pathType: team.path_type || 'line'
            });
          }
        }
        return result.id;
      });

      res.json({ success: true, id: eventId });
    } catch (error: any) {
      console.error("Error creating maraude event:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/maraude-events/:id", async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id);
    const { 
      date, 
      teams, 
      prep_location, 
      prep_time, 
      start_location, 
      start_time, 
      prep_lat, 
      prep_lng, 
      start_lat, 
      start_lng,
      prep_description,
      info_document_url,
      meals_prepared,
      meals_description
    } = req.body;
    
    console.log(`[DEBUG] Updating maraude event ${eventId}: meals_prepared=${meals_prepared}, meals_description=${meals_description}`);
    
    try {
      await db.transaction(async (tx) => {
        await tx.update(schema.maraudeEvents).set({ 
          date,
          prepLocation: prep_location ?? null,
          prepTime: prep_time ?? null,
          startLocation: start_location ?? null,
          startTime: start_time ?? null,
          prepLat: prep_lat ?? null,
          prepLng: prep_lng ?? null,
          startLat: start_lat ?? null,
          startLng: start_lng ?? null,
          prepDescription: prep_description ?? null,
          infoDocumentUrl: info_document_url ?? null,
          mealsPrepared: meals_prepared ?? null,
          mealsDescription: meals_description ?? null,
          associationId: req.body.association_id ? parseInt(req.body.association_id) : undefined
        })
        .where(eq(schema.maraudeEvents.id, eventId));
        
        const existingTeams = await tx.select({ id: schema.maraudeTeams.id })
          .from(schema.maraudeTeams)
          .where(eq(schema.maraudeTeams.eventId, eventId));
          
        const existingTeamIds = existingTeams.map((t: any) => t.id);
        const incomingTeamIds = (teams || []).filter((t: any) => t.id).map((t: any) => t.id);
        
        const teamsToDelete = existingTeamIds.filter(tid => !incomingTeamIds.includes(tid));
        for (const tid of teamsToDelete) {
          const teamInfo = await tx.select({ teamName: schema.maraudeTeams.teamName })
            .from(schema.maraudeTeams)
            .where(eq(schema.maraudeTeams.id, tid))
            .then(res => res[0]);
            
          const reportsList = await tx.select().from(schema.reports).where(eq(schema.reports.maraudeTeamId, tid));
          for (const report of reportsList) {
            await tx.insert(schema.archivedReports).values({
              originalReportId: report.id,
              maraudeName: `Maraude du ${date}`,
              teamName: teamInfo?.teamName || 'Inconnue',
              date: report.date?.toISOString(),
              content: report.content,
              author: report.author,
              peopleHelped: report.peopleHelped,
              associationId: req.headers['x-association-id'] ? parseInt(req.headers['x-association-id'] as string) : null
            });
          }

          await tx.delete(schema.maraudeTeams).where(eq(schema.maraudeTeams.id, tid));
        }
        
        if (teams && Array.isArray(teams)) {
          for (const team of teams) {
            let pathRaw = typeof team.path_data === 'string' ? JSON.parse(team.path_data) : team.path_data;
            let pathData = Array.isArray(pathRaw) ? [...pathRaw] : [];

            if (team.id && existingTeamIds.includes(team.id)) {
              await tx.update(schema.maraudeTeams).set({
                teamName: team.team_name,
                pathData: JSON.stringify(pathData),
                color: team.color,
                pathType: team.path_type || 'line'
              }).where(eq(schema.maraudeTeams.id, team.id));
            } else {
              await tx.insert(schema.maraudeTeams).values({
                eventId: eventId,
                teamName: team.team_name,
                pathData: JSON.stringify(pathData),
                color: team.color,
                pathType: team.path_type || 'line'
              });
            }
          }
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating maraude event:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/prep-registrations", async (req, res) => {
    const { maraude_event_id, user_id } = req.body;
    try {
      await db.insert(schema.prepRegistrations)
        .values({ maraudeEventId: maraude_event_id, userId: user_id })
        .onConflictDoNothing();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/prep-registrations/:eventId/:userId", async (req, res) => {
    const { eventId, userId } = req.params;
    try {
      await db.delete(schema.prepRegistrations)
        .where(and(eq(schema.prepRegistrations.maraudeEventId, parseInt(eventId)), eq(schema.prepRegistrations.userId, parseInt(userId))));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/maraude-events/:id", async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id);
    console.log(`DELETE /api/maraude-events/${eventId} - START`);
    
    try {
      const resultCount = await db.transaction(async (tx) => {
        const event = await tx.select({ date: schema.maraudeEvents.date })
          .from(schema.maraudeEvents)
          .where(eq(schema.maraudeEvents.id, eventId))
          .then(res => res[0]);
          
        const eventDate = event ? event.date : 'Inconnue';

        const teamsList = await tx.select({ id: schema.maraudeTeams.id, teamName: schema.maraudeTeams.teamName })
          .from(schema.maraudeTeams)
          .where(eq(schema.maraudeTeams.eventId, eventId));
          
        for (const team of teamsList) {
          const reportsList = await tx.select().from(schema.reports).where(eq(schema.reports.maraudeTeamId, team.id));
          for (const report of reportsList) {
            await tx.insert(schema.archivedReports).values({
              originalReportId: report.id,
              maraudeName: `Maraude du ${eventDate}`,
              teamName: team.teamName || 'Inconnue',
              date: report.date?.toISOString(),
              content: report.content,
              author: report.author,
              peopleHelped: report.peopleHelped,
              associationId: req.headers['x-association-id'] ? parseInt(req.headers['x-association-id'] as string) : null
            });
          }

          await tx.delete(schema.reports).where(eq(schema.reports.maraudeTeamId, team.id));
          await tx.delete(schema.distributions).where(eq(schema.distributions.maraudeTeamId, team.id));
          await tx.delete(schema.registrations).where(eq(schema.registrations.maraudeTeamId, team.id));
        }
        await tx.delete(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, eventId));
        const deleteResult = await tx.delete(schema.maraudeEvents).where(eq(schema.maraudeEvents.id, eventId));
        return 1; // Simplification, in Postgres delete returns count if we use returning or check result
      });

      console.log(`DELETE /api/maraude-events/${eventId} - SUCCESS`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`DELETE /api/maraude-events/${id} - ERROR:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/maraude-events/:id/status", async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id);
    const { status } = req.body;
    try {
      await db.update(schema.maraudeEvents)
        .set({ status })
        .where(eq(schema.maraudeEvents.id, eventId));
      
      if (status === 'completed') {
        await db.delete(schema.userLocations).where(eq(schema.userLocations.maraudeEventId, eventId));
        
        // Cancel pending distributions for this event
        const teamIdsResult = await db.select({ id: schema.maraudeTeams.id })
          .from(schema.maraudeTeams)
          .where(eq(schema.maraudeTeams.eventId, eventId));
          
        const teamIds = teamIdsResult.map(t => t.id);
        if (teamIds.length > 0) {
          await db.update(schema.distributions)
            .set({ status: 'cancelled' })
            .where(and(eq(schema.distributions.status, 'pending'), sql`${schema.distributions.maraudeTeamId} IN (${sql.join(teamIds, sql`, `)})`));
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/distributions", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    const fetchAll = req.query.all === 'true';
    
    try {
      const query = db.select({
        id: schema.distributions.id,
        lat: schema.distributions.lat,
        lng: schema.distributions.lng,
        people_helped: schema.distributions.peopleHelped,
        maraude_team_id: schema.distributions.maraudeTeamId,
        status: schema.distributions.status,
        mobile_meals_delivered: schema.distributions.mobileMealsDelivered,
        created_at: schema.distributions.createdAt,
        association_id: schema.maraudeEvents.associationId,
        maraude_event_id: schema.maraudeTeams.eventId,
        direct_help_count: sql<number>`(SELECT COUNT(*) FROM distribution_beneficiaries WHERE distribution_id = ${schema.distributions.id} AND direct_help = true)`,
        mobile_meal_count: sql<number>`(SELECT COUNT(*) FROM distribution_beneficiaries WHERE distribution_id = ${schema.distributions.id} AND mobile_meal = true)`,
        total_helped_count: sql<number>`(SELECT COUNT(*) FROM distribution_beneficiaries WHERE distribution_id = ${schema.distributions.id} AND (direct_help = true OR mobile_meal = true))`,
      })
      .from(schema.distributions)
      .leftJoin(schema.maraudeTeams, eq(schema.distributions.maraudeTeamId, schema.maraudeTeams.id))
      .leftJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id));

      let dists;
      if (assoId && !fetchAll) {
        dists = await query.where(eq(schema.maraudeEvents.associationId, parseInt(assoId)));
      } else {
        dists = await query;
      }
      res.json(dists);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/distributions", async (req, res) => {
    const { lat, lng, people_helped, maraude_team_id, status, mobile_meals_delivered, beneficiaries } = req.body;
    try {
      const distId = await db.transaction(async (tx) => {
        if (maraude_team_id) {
          const teamExists = await tx.select().from(schema.maraudeTeams).where(eq(schema.maraudeTeams.id, maraude_team_id)).then(res => res[0]);
          if (!teamExists) {
            throw new Error("Équipe non trouvée");
          }
        }
        
        const [distResult] = await tx.insert(schema.distributions).values({
          lat,
          lng,
          peopleHelped: people_helped,
          maraudeTeamId: maraude_team_id || null,
          status: status || 'completed',
          mobileMealsDelivered: mobile_meals_delivered || 0
        }).returning({ id: schema.distributions.id });

        if (beneficiaries && Array.isArray(beneficiaries)) {
          for (const ben of beneficiaries) {
            let benId = ben.id;
            const isAnonymous = !ben.first_name && !ben.last_name;
            
            if (!benId && !isAnonymous) {
              const firstName = ben.first_name || '';
              const lastName = ben.last_name || '';
              const [benResult] = await tx.insert(schema.beneficiaries).values({
                firstName,
                lastName,
                associationId: req.headers['x-association-id'] ? parseInt(req.headers['x-association-id'] as string) : null
              }).returning({ id: schema.beneficiaries.id });
              benId = benResult.id;
            }
            
            await tx.insert(schema.distributionBeneficiaries).values({
              distributionId: distResult.id,
              beneficiaryId: benId || null,
              comment: ben.comment || '',
              directHelp: !!ben.direct_help,
              mobileMeal: !!ben.mobile_meal,
              mobileMealType: ben.mobile_meal_type || null
            });
          }
        }
        return distResult.id;
      });

      res.json({ success: true, id: distId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/distributions/:id", async (req, res) => {
    const { id } = req.params;
    const distId = parseInt(id);
    const { lat, lng, people_helped, maraude_team_id, status, mobile_meals_delivered, beneficiaries } = req.body;
    try {
      await db.transaction(async (tx) => {
        await tx.update(schema.distributions).set({
          lat,
          lng,
          peopleHelped: people_helped,
          maraudeTeamId: maraude_team_id || null,
          status: status || 'completed',
          mobileMealsDelivered: mobile_meals_delivered || 0
        }).where(eq(schema.distributions.id, distId));
        
        await tx.delete(schema.distributionBeneficiaries).where(eq(schema.distributionBeneficiaries.distributionId, distId));

        if (beneficiaries && Array.isArray(beneficiaries)) {
          for (const ben of beneficiaries) {
            let benId = ben.id;
            const isAnonymous = !ben.first_name && !ben.last_name;
            
            if (!benId && !isAnonymous) {
              const firstName = ben.first_name || '';
              const lastName = ben.last_name || '';
              const [benResult] = await tx.insert(schema.beneficiaries).values({
                firstName,
                lastName,
                associationId: req.headers['x-association-id'] ? parseInt(req.headers['x-association-id'] as string) : null
              }).returning({ id: schema.beneficiaries.id });
              benId = benResult.id;
            }
            
            await tx.insert(schema.distributionBeneficiaries).values({
              distributionId: distId,
              beneficiaryId: benId || null,
              comment: ben.comment || '',
              directHelp: !!ben.direct_help,
              mobileMeal: !!ben.mobile_meal,
              mobileMealType: ben.mobile_meal_type || null
            });
          }
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating distribution:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/distributions/:id/beneficiaries", async (req, res) => {
    const { id } = req.params;
    try {
      const beneficiariesResult = await db.select({
        id: schema.beneficiaries.id,
        firstName: schema.beneficiaries.firstName,
        lastName: schema.beneficiaries.lastName,
        associationId: schema.beneficiaries.associationId,
        comment: schema.distributionBeneficiaries.comment,
        directHelp: schema.distributionBeneficiaries.directHelp,
        mobileMeal: schema.distributionBeneficiaries.mobileMeal,
        mobileMealType: schema.distributionBeneficiaries.mobileMealType,
      })
      .from(schema.beneficiaries)
      .innerJoin(schema.distributionBeneficiaries, eq(schema.beneficiaries.id, schema.distributionBeneficiaries.beneficiaryId))
      .where(eq(schema.distributionBeneficiaries.distributionId, parseInt(id)));
      
      res.json(beneficiariesResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/distributions/:id/status", async (req, res) => {
    const { id } = req.params;
    const distId = parseInt(id);
    const { status, maraude_team_id, mobile_meals_delivered } = req.body;
    try {
      if (maraude_team_id) {
        await db.update(schema.distributions)
          .set({
            status,
            maraudeTeamId: parseInt(maraude_team_id),
            mobileMealsDelivered: mobile_meals_delivered !== undefined ? mobile_meals_delivered : null
          })
          .where(eq(schema.distributions.id, distId));
      } else {
        await db.update(schema.distributions)
          .set({
            status,
            mobileMealsDelivered: mobile_meals_delivered !== undefined ? mobile_meals_delivered : null
          })
          .where(eq(schema.distributions.id, distId));
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/distributions/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.distributions).where(eq(schema.distributions.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Beneficiaries API
  app.get("/api/beneficiaries", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      const query = db.select({
        id: schema.beneficiaries.id,
        firstName: schema.beneficiaries.firstName,
        lastName: schema.beneficiaries.lastName,
        associationId: schema.beneficiaries.associationId,
        createdAt: schema.beneficiaries.createdAt,
        encounterCount: sql<number>`COUNT(${schema.distributionBeneficiaries.id})`,
        lastEncounter: sql<string>`MAX(${schema.distributionBeneficiaries.createdAt})`,
      })
      .from(schema.beneficiaries)
      .leftJoin(schema.distributionBeneficiaries, eq(schema.beneficiaries.id, schema.distributionBeneficiaries.beneficiaryId))
      .groupBy(schema.beneficiaries.id);

      let beneficiariesResult;
      if (assoId) {
        beneficiariesResult = await query.where(eq(schema.beneficiaries.associationId, parseInt(assoId))).orderBy(asc(schema.beneficiaries.lastName), asc(schema.beneficiaries.firstName));
      } else {
        beneficiariesResult = await query.orderBy(asc(schema.beneficiaries.lastName), asc(schema.beneficiaries.firstName));
      }
      res.json(beneficiariesResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/beneficiaries/:id/history", async (req, res) => {
    const { id } = req.params;
    try {
      const history = await db.select({
        comment: schema.distributionBeneficiaries.comment,
        createdAt: schema.distributionBeneficiaries.createdAt,
        directHelp: schema.distributionBeneficiaries.directHelp,
        mobileMeal: schema.distributionBeneficiaries.mobileMeal,
        mobileMealType: schema.distributionBeneficiaries.mobileMealType,
        lat: schema.distributions.lat,
        lng: schema.distributions.lng,
        teamName: schema.maraudeTeams.teamName,
        eventDate: schema.maraudeEvents.date,
      })
      .from(schema.distributionBeneficiaries)
      .innerJoin(schema.distributions, eq(schema.distributionBeneficiaries.distributionId, schema.distributions.id))
      .leftJoin(schema.maraudeTeams, eq(schema.distributions.maraudeTeamId, schema.maraudeTeams.id))
      .leftJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
      .where(eq(schema.distributionBeneficiaries.beneficiaryId, parseInt(id)))
      .orderBy(desc(schema.distributionBeneficiaries.createdAt));
      
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/beneficiaries/:id", async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name } = req.body;
    try {
      await db.update(schema.beneficiaries)
        .set({ firstName: first_name, lastName: last_name })
        .where(eq(schema.beneficiaries.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/beneficiaries/merge", async (req, res) => {
    const { primary_id, secondary_ids } = req.body;
    try {
      if (!primary_id || !secondary_ids || !Array.isArray(secondary_ids) || secondary_ids.length === 0) {
        return res.status(400).json({ error: "Invalid parameters" });
      }
      
      await db.transaction(async (tx) => {
        // Update distribution_beneficiaries to point to primary_id
        await tx.update(schema.distributionBeneficiaries)
          .set({ beneficiaryId: primary_id })
          .where(inArray(schema.distributionBeneficiaries.beneficiaryId, secondary_ids));
        
        // Delete secondary beneficiaries
        await tx.delete(schema.beneficiaries).where(inArray(schema.beneficiaries.id, secondary_ids));
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/registrations", async (req, res) => {
    const { maraude_team_id } = req.query;
    const assoId = req.headers['x-association-id'] as string;
    
    try {
      const query = db.select({
        id: schema.registrations.id,
        maraude_team_id: schema.registrations.maraudeTeamId,
        user_id: schema.registrations.userId,
        is_leader: schema.registrations.isLeader,
        date: schema.registrations.date,
        username: schema.users.username,
      })
      .from(schema.registrations)
      .innerJoin(schema.users, eq(schema.registrations.userId, schema.users.id));

      let conditions = [];
      if (assoId) {
        query.innerJoin(schema.maraudeTeams, eq(schema.registrations.maraudeTeamId, schema.maraudeTeams.id))
             .innerJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id));
        conditions.push(eq(schema.maraudeEvents.associationId, parseInt(assoId)));
      }
      if (maraude_team_id) {
        conditions.push(eq(schema.registrations.maraudeTeamId, parseInt(maraude_team_id as string)));
      }

      let regs;
      if (conditions.length > 0) {
        regs = await query.where(and(...conditions));
      } else {
        regs = await query;
      }
      res.json(regs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/registrations", async (req, res) => {
    const { maraude_team_id, user_id, is_leader } = req.body;
    
    try {
      // Check if user exists (to avoid FK failure if session is stale)
      const userExists = await db.select().from(schema.users).where(eq(schema.users.id, user_id)).then(res => res[0]);
      if (!userExists) {
        return res.status(401).json({ error: "Utilisateur non trouvé ou session expirée. Veuillez vous reconnecter." });
      }

      // Check if user already registered in THIS event (any team)
      const team = await db.select({ eventId: schema.maraudeTeams.eventId })
        .from(schema.maraudeTeams)
        .where(eq(schema.maraudeTeams.id, maraude_team_id))
        .then(res => res[0]);
        
      if (!team) {
        return res.status(404).json({ error: "Équipe non trouvée" });
      }
      const eventTeams = await db.select({ id: schema.maraudeTeams.id }).from(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, team.eventId));
      const teamIds = eventTeams.map((t: any) => t.id);
      
      const existing = await db.select()
        .from(schema.registrations)
        .where(and(eq(schema.registrations.userId, user_id), inArray(schema.registrations.maraudeTeamId, teamIds)))
        .then(res => res[0]);
      
      if (existing) {
        return res.status(400).json({ error: "Déjà inscrit à une équipe pour cette maraude" });
      }

      // If registering as member, check if there is a leader
      if (!is_leader) {
        const leader = await db.select()
          .from(schema.registrations)
          .where(and(eq(schema.registrations.maraudeTeamId, maraude_team_id), eq(schema.registrations.isLeader, 1)))
          .then(res => res[0]);
          
        if (!leader) {
          return res.status(400).json({ error: "Un chef de circuit doit s'inscrire avant les membres" });
        }
      } else {
        // Check if there is already a leader
        const leader = await db.select()
          .from(schema.registrations)
          .where(and(eq(schema.registrations.maraudeTeamId, maraude_team_id), eq(schema.registrations.isLeader, 1)))
          .then(res => res[0]);
          
        if (leader) {
          return res.status(400).json({ error: "Il y a déjà un chef de circuit pour cette équipe" });
        }
      }

      await db.insert(schema.registrations).values({ maraudeTeamId: maraude_team_id, userId: user_id, isLeader: is_leader ? 1 : 0 });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error creating registration:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/registrations/:teamId/:userId", async (req, res) => {
    const { teamId, userId } = req.params;
    try {
      const result = await db.delete(schema.registrations)
        .where(and(eq(schema.registrations.maraudeTeamId, parseInt(teamId)), eq(schema.registrations.userId, parseInt(userId))));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting registration:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reports", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    
    try {
      const query = db.select({
        id: schema.reports.id,
        maraude_team_id: schema.reports.maraudeTeamId,
        date: schema.reports.date,
        content: schema.reports.content,
        author: schema.reports.author,
        people_helped: schema.reports.peopleHelped,
        created_at: schema.reports.createdAt,
      }).from(schema.reports);

      let reportsResult;
      if (assoId) {
        reportsResult = await query
          .innerJoin(schema.maraudeTeams, eq(schema.reports.maraudeTeamId, schema.maraudeTeams.id))
          .innerJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
          .where(eq(schema.maraudeEvents.associationId, parseInt(assoId)))
          .orderBy(desc(schema.reports.date));
      } else {
        reportsResult = await query.orderBy(desc(schema.reports.date));
      }
      res.json(reportsResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/archived-reports", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let reportsResult;
      if (assoId) {
        reportsResult = await db.select().from(schema.archivedReports)
          .where(eq(schema.archivedReports.associationId, parseInt(assoId)))
          .orderBy(desc(schema.archivedReports.archivedAt));
      } else {
        reportsResult = await db.select().from(schema.archivedReports).orderBy(desc(schema.archivedReports.archivedAt));
      }
      res.json(reportsResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/archived-reports/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.archivedReports).where(eq(schema.archivedReports.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Tickets API
  app.get("/api/tickets", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      const query = db.select({
        id: schema.tickets.id,
        userId: schema.tickets.userId,
        subject: schema.tickets.subject,
        message: schema.tickets.message,
        status: schema.tickets.status,
        associationId: schema.tickets.associationId,
        createdAt: schema.tickets.createdAt,
        userName: schema.users.username,
      })
      .from(schema.tickets)
      .innerJoin(schema.users, eq(schema.tickets.userId, schema.users.id));

      let ticketsResult;
      if (assoId) {
        ticketsResult = await query.where(eq(schema.tickets.associationId, parseInt(assoId))).orderBy(desc(schema.tickets.createdAt));
      } else {
        ticketsResult = await query.orderBy(desc(schema.tickets.createdAt));
      }
      res.json(ticketsResult);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/stats", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let maraudesCount = 0;
      let reposCount = 0;
      let distribCount = 0;
      let peopleHelped = 0;

      if (assoId) {
        const maraudeRes = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.maraudeEvents).where(eq(schema.maraudeEvents.associationId, parseInt(assoId))).then(res => res[0]);
        maraudesCount = maraudeRes?.count || 0;

        const repoRes = await db.select({ count: sql<number>`COUNT(*)` })
          .from(schema.reports)
          .innerJoin(schema.maraudeTeams, eq(schema.reports.maraudeTeamId, schema.maraudeTeams.id))
          .innerJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
          .where(eq(schema.maraudeEvents.associationId, parseInt(assoId)))
          .then(res => res[0]);
        reposCount = repoRes?.count || 0;
        
        const distribQuery = await db.select({ 
          count: sql<number>`COUNT(*)`, 
          peopleHelped: sql<number>`SUM(${schema.distributions.peopleHelped})`, 
          mobileMeals: sql<number>`SUM(${schema.distributions.mobileMealsDelivered})` 
        })
        .from(schema.distributions)
        .innerJoin(schema.maraudeTeams, eq(schema.distributions.maraudeTeamId, schema.maraudeTeams.id))
        .innerJoin(schema.maraudeEvents, eq(schema.maraudeTeams.eventId, schema.maraudeEvents.id))
        .where(eq(schema.maraudeEvents.associationId, parseInt(assoId)))
        .then(res => res[0]);
        
        distribCount = distribQuery?.count || 0;
        peopleHelped = (Number(distribQuery?.peopleHelped) || 0) + (Number(distribQuery?.mobileMeals) || 0);
      } else {
        const maraudeRes = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.maraudeEvents).then(res => res[0]);
        maraudesCount = maraudeRes?.count || 0;

        const repoRes = await db.select({ count: sql<number>`COUNT(*)` }).from(schema.reports).then(res => res[0]);
        reposCount = repoRes?.count || 0;

        const distribQuery = await db.select({ 
          count: sql<number>`COUNT(*)`, 
          peopleHelped: sql<number>`SUM(${schema.distributions.peopleHelped})`, 
          mobileMeals: sql<number>`SUM(${schema.distributions.mobileMealsDelivered})` 
        })
        .from(schema.distributions)
        .then(res => res[0]);
        distribCount = distribQuery?.count || 0;
        peopleHelped = (Number(distribQuery?.peopleHelped) || 0) + (Number(distribQuery?.mobileMeals) || 0);
      }

      res.json({
        maraudesCount,
        reposCount,
        distribCount,
        peopleHelped
      });
    } catch (e: any) {
       res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tickets", async (req, res) => {
    const { user_id, subject, message } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    try {
      await db.insert(schema.tickets).values({
        userId: user_id,
        subject: subject,
        message: message,
        associationId: assoId ? parseInt(assoId) : null
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tickets/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await db.update(schema.tickets).set({ status }).where(eq(schema.tickets.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/tickets/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.tickets).where(eq(schema.tickets.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/stock/:id", async (req, res) => {
    const { id } = req.params;
    const { 
      item_name, 
      unit_type, 
      unit_value, 
      category_id, 
      expiry_date, 
      status, 
      box_id, 
      apply_to_lot 
    } = req.body;
    
    try {
      const targetId = parseInt(id);
      // Clean expiry_date: if empty string or whitespace, store null. If date string with time/ISO, take YYYY-MM-DD
      let cleanExpiryDate: string | null = null;
      if (expiry_date && typeof expiry_date === 'string') {
        const trimmed = expiry_date.trim();
        if (trimmed) {
          const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
          cleanExpiryDate = match ? match[1] : trimmed;
        }
      }

      // Check current item to know its details if applying to lot
      const currentItem = await db.select().from(schema.stock).where(eq(schema.stock.id, targetId)).then(r => r[0]);
      if (!currentItem) {
        return res.status(404).json({ error: "Article non trouvé" });
      }

      const updateValues: Record<string, any> = {
        itemName: item_name !== undefined ? item_name : currentItem.itemName,
        unitType: unit_type !== undefined ? unit_type : currentItem.unitType,
        unitValue: unit_value !== undefined ? unit_value : currentItem.unitValue,
        categoryId: category_id !== undefined && category_id !== '' ? (category_id ? parseInt(String(category_id)) : null) : currentItem.categoryId,
        expiryDate: expiry_date !== undefined ? cleanExpiryDate : currentItem.expiryDate,
        status: status !== undefined ? status : currentItem.status,
        boxId: box_id !== undefined ? (box_id ? String(box_id).trim() : null) : currentItem.boxId
      };

      if (apply_to_lot) {
        // Apply changes to all available items of the same name (and same box if previously in the same box)
        const conditions = [
          eq(schema.stock.itemName, currentItem.itemName),
          eq(schema.stock.status, 'available')
        ];
        if (currentItem.boxId) {
          conditions.push(eq(schema.stock.boxId, currentItem.boxId));
        }
        if (currentItem.associationId) {
          conditions.push(eq(schema.stock.associationId, currentItem.associationId));
        }

        await db.update(schema.stock).set(updateValues).where(and(...conditions));
      } else {
        await db.update(schema.stock).set(updateValues).where(eq(schema.stock.id, targetId));
      }

      res.json({ success: true, updatedExpiry: cleanExpiryDate });
    } catch (error: any) {
      console.error("Error updating stock item:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/stock/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.stock).where(eq(schema.stock.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting stock item:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports", async (req, res) => {
    const { maraude_team_id, content, author, user_id, people_helped } = req.body;
    
    try {
      const teamExists = await db.select().from(schema.maraudeTeams).where(eq(schema.maraudeTeams.id, maraude_team_id)).then(res => res[0]);
      if (!teamExists) {
        return res.status(404).json({ error: "Équipe non trouvée" });
      }
      
      const userExists = await db.select().from(schema.users).where(eq(schema.users.id, user_id)).then(res => res[0]);
      if (!userExists) {
        return res.status(401).json({ error: "Utilisateur non trouvé ou session expirée." });
      }

      await db.insert(schema.reports).values({
        maraudeTeamId: maraude_team_id,
        content,
        author,
        userId: user_id,
        peopleHelped: people_helped || 0
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Report transaction error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/reports/:id", async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    try {
      await db.update(schema.reports).set({ content }).where(eq(schema.reports.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/reports/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.reports).where(eq(schema.reports.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Announcements Routes
  app.get("/api/announcements", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let announcements;
      if (assoId) {
        announcements = await db.select().from(schema.announcements).where(eq(schema.announcements.associationId, parseInt(assoId))).orderBy(desc(schema.announcements.createdAt));
      } else {
        announcements = await db.select().from(schema.announcements).orderBy(desc(schema.announcements.createdAt));
      }
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/announcements", async (req, res) => {
    const { title, content, author_name } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    try {
      const [result] = await db.insert(schema.announcements).values({
        title,
        content,
        authorName: author_name,
        associationId: assoId ? parseInt(assoId) : null
      }).returning({ id: schema.announcements.id });
      res.json({ id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/announcements/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.announcements).where(eq(schema.announcements.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Resources Routes
  app.get("/api/resources", async (req, res) => {
    const assoId = req.headers['x-association-id'] as string;
    try {
      let resources;
      if (assoId) {
        resources = await db.select().from(schema.resources).where(eq(schema.resources.associationId, parseInt(assoId))).orderBy(desc(schema.resources.createdAt));
      } else {
        resources = await db.select().from(schema.resources).orderBy(desc(schema.resources.createdAt));
      }
      res.json(resources);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/resources", async (req, res) => {
    const { title, url, category } = req.body;
    const assoId = req.headers['x-association-id'] as string;
    try {
      const [result] = await db.insert(schema.resources).values({
        title,
        url,
        category,
        associationId: assoId ? parseInt(assoId) : null
      }).returning({ id: schema.resources.id });
      res.json({ id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/resources/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.resources).where(eq(schema.resources.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gallery Routes
  app.get("/api/gallery", async (req, res) => {
    try {
      const images = await db.select().from(schema.galleryImages).orderBy(desc(schema.galleryImages.createdAt));
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    const { url, caption } = req.body;
    try {
      const [result] = await db.insert(schema.galleryImages).values({
        url,
        caption
      }).returning({ id: schema.galleryImages.id });
      res.json({ id: result.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.galleryImages).where(eq(schema.galleryImages.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- INTER-ASSO API ROUTES ---

  app.post("/api/inter-asso/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      const asso = await db.select().from(schema.associations).where(eq(schema.associations.username, username)).then(res => res[0]);
      
      if (asso && bcrypt.compareSync(password, asso.password)) {
        const { password: _, ...assoWithoutPassword } = asso;
        res.json(assoWithoutPassword);
      } else {
        res.status(401).json({ error: "Identifiants invalides" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inter-asso/associations", async (req, res) => {
    try {
      const assos = await db.select({
        id: schema.associations.id,
        name: schema.associations.name,
        username: schema.associations.username,
        email: schema.associations.email,
        color: schema.associations.color,
        isAdmin: schema.associations.isAdmin,
        canManageMaraudes: schema.associations.canManageMaraudes,
      }).from(schema.associations);
      res.json(assos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inter-asso/associations", async (req, res) => {
    const { name, username, password, email, color, is_admin, can_manage_maraudes } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const [result] = await db.insert(schema.associations).values({
        name,
        username,
        password: hashedPassword,
        email,
        color,
        isAdmin: is_admin ? 1 : 0,
        canManageMaraudes: can_manage_maraudes !== undefined ? can_manage_maraudes : 1
      }).returning({ id: schema.associations.id });
      res.json({ success: true, id: result.id });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        res.status(400).json({ error: "Ce nom d'association ou nom d'utilisateur existe déjà." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.put("/api/inter-asso/associations/:id", async (req, res) => {
    const { id } = req.params;
    const assoId = parseInt(id);
    const { name, username, email, color, is_admin, can_manage_maraudes, password } = req.body;
    try {
      const updateData: any = {
        name,
        username,
        email,
        color,
        isAdmin: is_admin ? 1 : 0,
        canManageMaraudes: can_manage_maraudes !== undefined ? can_manage_maraudes : 1,
      };
      if (password) {
        updateData.password = bcrypt.hashSync(password, 10);
      }
      await db.update(schema.associations).set(updateData).where(eq(schema.associations.id, assoId));
      res.json({ success: true });
    } catch (error: any) {
      if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
        res.status(400).json({ error: "Ce nom d'association ou nom d'utilisateur existe déjà." });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.delete("/api/inter-asso/associations/:id", async (req, res) => {
    const { id } = req.params;
    const assoId = parseInt(id);
    try {
      const asso = await db.select().from(schema.associations).where(eq(schema.associations.id, assoId)).then(res => res[0]);
      if (!asso) return res.status(404).json({ error: "Association non trouvée" });
      
      if (asso.username === 'bobosetgamelles' || asso.username === 'admin') {
        return res.status(403).json({ error: "Cette association ne peut pas être supprimée." });
      }

      await db.transaction(async (tx) => {
        // Find dependent IDs
        const eventIds = await tx.select({ id: schema.maraudeEvents.id }).from(schema.maraudeEvents).where(eq(schema.maraudeEvents.associationId, assoId)).then(res => res.map(r => r.id));
        const teamIds = eventIds.length > 0 ? await tx.select({ id: schema.maraudeTeams.id }).from(schema.maraudeTeams).where(inArray(schema.maraudeTeams.eventId, eventIds)).then(res => res.map(r => r.id)) : [];
        const distributionIds = teamIds.length > 0 ? await tx.select({ id: schema.distributions.id }).from(schema.distributions).where(inArray(schema.distributions.maraudeTeamId, teamIds)).then(res => res.map(r => r.id)) : [];

        if (distributionIds.length > 0) {
          await tx.delete(schema.distributionBeneficiaries).where(inArray(schema.distributionBeneficiaries.distributionId, distributionIds));
          await tx.delete(schema.distributions).where(inArray(schema.distributions.id, distributionIds));
        }
        if (teamIds.length > 0) {
          await tx.delete(schema.reports).where(inArray(schema.reports.maraudeTeamId, teamIds));
          await tx.delete(schema.registrations).where(inArray(schema.registrations.maraudeTeamId, teamIds));
          await tx.delete(schema.maraudeTeams).where(inArray(schema.maraudeTeams.id, teamIds));
        }
        if (eventIds.length > 0) {
          await tx.delete(schema.userLocations).where(inArray(schema.userLocations.maraudeEventId, eventIds));
          await tx.delete(schema.maraudeEvents).where(eq(schema.maraudeEvents.associationId, assoId));
        }

        await tx.delete(schema.resources).where(eq(schema.resources.associationId, assoId));
        await tx.delete(schema.announcements).where(eq(schema.announcements.associationId, assoId));
        await tx.delete(schema.tickets).where(eq(schema.tickets.associationId, assoId));
        await tx.delete(schema.circuits).where(eq(schema.circuits.associationId, assoId));
        
        const stockIds = await tx.select({ id: schema.stock.id }).from(schema.stock).where(eq(schema.stock.associationId, assoId)).then(res => res.map(r => r.id));
        if (stockIds.length > 0) {
          await tx.delete(schema.stockHistory).where(inArray(schema.stockHistory.stockId, stockIds));
          await tx.delete(schema.stock).where(eq(schema.stock.associationId, assoId));
        }
        
        const categoryIds = await tx.select({ id: schema.stockCategories.id }).from(schema.stockCategories).where(eq(schema.stockCategories.associationId, assoId)).then(res => res.map(r => r.id));
        if (categoryIds.length > 0) {
          await tx.delete(schema.stockThresholds).where(inArray(schema.stockThresholds.categoryId, categoryIds));
          await tx.delete(schema.stockCategories).where(eq(schema.stockCategories.associationId, assoId));
        }
        
        await tx.delete(schema.stockPartners).where(eq(schema.stockPartners.associationId, assoId));
        await tx.delete(schema.stockTodos).where(eq(schema.stockTodos.associationId, assoId));
        await tx.delete(schema.beneficiaries).where(eq(schema.beneficiaries.associationId, assoId));
        await tx.delete(schema.archivedReports).where(eq(schema.archivedReports.associationId, assoId));
        
        const userIds = await tx.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.associationId, assoId)).then(res => res.map(r => r.id));
        if (userIds.length > 0) {
          await tx.delete(schema.userRoles).where(inArray(schema.userRoles.userId, userIds));
          await tx.delete(schema.userGroups).where(inArray(schema.userGroups.userId, userIds));
          await tx.delete(schema.users).where(eq(schema.users.associationId, assoId));
        }
        await tx.delete(schema.associations).where(eq(schema.associations.id, assoId));
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete association error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inter-asso/events", async (req, res) => {
    try {
      const events = await db.select({
        id: schema.maraudeEvents.id,
        date: schema.maraudeEvents.date,
        associationId: schema.maraudeEvents.associationId,
        status: schema.maraudeEvents.status,
        createdAt: schema.maraudeEvents.createdAt,
        associationName: schema.associations.name,
        associationColor: schema.associations.color,
      })
      .from(schema.maraudeEvents)
      .innerJoin(schema.associations, eq(schema.maraudeEvents.associationId, schema.associations.id))
      .orderBy(desc(schema.maraudeEvents.date));
      
      const result = await Promise.all(events.map(async (e) => {
        const teams = await db.select().from(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, e.id));
        return {
          ...e,
          teams: teams.map((t: any) => ({
            ...t,
            path_data: t.pathData ? JSON.parse(t.pathData) : []
          }))
        };
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inter-asso/events", async (req, res) => {
    const { date, teams, association_id } = req.body;
    
    try {
      const eventId = await db.transaction(async (tx) => {
        const [result] = await tx.insert(schema.maraudeEvents).values({
          date,
          associationId: association_id
        }).returning({ id: schema.maraudeEvents.id });
        
        for (const team of teams) {
          await tx.insert(schema.maraudeTeams).values({
            eventId: result.id,
            teamName: team.team_name,
            pathData: JSON.stringify(team.path_data),
            color: team.color
          });
        }
        return result.id;
      });

      res.json({ success: true, id: eventId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/inter-asso/events/:id", async (req, res) => {
    const { id } = req.params;
    const eventId = parseInt(id);
    const { date, teams } = req.body;
    
    try {
      await db.transaction(async (tx) => {
        await tx.update(schema.maraudeEvents).set({ date }).where(eq(schema.maraudeEvents.id, eventId));
        
        const existingTeams = await tx.select({ id: schema.maraudeTeams.id }).from(schema.maraudeTeams).where(eq(schema.maraudeTeams.eventId, eventId));
        const existingTeamIds = existingTeams.map((t: any) => t.id);
        const incomingTeamIds = teams.filter((t: any) => t.id).map((t: any) => t.id);
        
        const teamsToDelete = existingTeamIds.filter(tid => !incomingTeamIds.includes(tid));
        if (teamsToDelete.length > 0) {
          await tx.delete(schema.maraudeTeams).where(inArray(schema.maraudeTeams.id, teamsToDelete));
        }
        
        for (const team of teams) {
          if (team.id) {
            await tx.update(schema.maraudeTeams).set({
              teamName: team.team_name,
              pathData: JSON.stringify(team.path_data),
              color: team.color
            }).where(eq(schema.maraudeTeams.id, team.id));
          } else {
            await tx.insert(schema.maraudeTeams).values({
              eventId: eventId,
              teamName: team.team_name,
              pathData: JSON.stringify(team.path_data),
              color: team.color
            });
          }
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/inter-asso/events/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await db.delete(schema.maraudeEvents).where(eq(schema.maraudeEvents.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inter-asso/circuits", async (req, res) => {
    try {
      const circuits = await db.select({
        id: schema.circuits.id,
        name: schema.circuits.name,
        pathData: schema.circuits.pathData,
        color: schema.circuits.color,
        associationId: schema.circuits.associationId,
        createdAt: schema.circuits.createdAt,
        associationName: schema.associations.name,
      })
      .from(schema.circuits)
      .innerJoin(schema.associations, eq(schema.circuits.associationId, schema.associations.id));
      
      res.json(circuits.map((c: any) => ({ ...c, path_data: c.pathData ? JSON.parse(c.pathData) : [] })));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inter-asso/circuits", async (req, res) => {
    const { name, path_data, color, association_id } = req.body;
    try {
      await db.insert(schema.circuits).values({
        name,
        pathData: JSON.stringify(path_data),
        color,
        associationId: association_id
      });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maraude-locations/:eventId", async (req, res) => {
    const { eventId } = req.params;
    try {
      const locations = await db.select({
        userId: schema.userLocations.userId,
        maraudeEventId: schema.userLocations.maraudeEventId,
        teamId: schema.userLocations.teamId,
        lat: schema.userLocations.lat,
        lng: schema.userLocations.lng,
        lastUpdated: schema.userLocations.lastUpdated,
        username: schema.users.username,
        avatarUrl: schema.users.avatarUrl,
        teamColor: schema.maraudeTeams.color,
      })
      .from(schema.userLocations)
      .innerJoin(schema.users, eq(schema.userLocations.userId, schema.users.id))
      .innerJoin(schema.maraudeTeams, eq(schema.userLocations.teamId, schema.maraudeTeams.id))
      .where(eq(schema.userLocations.maraudeEventId, parseInt(eventId)));
      
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }
  
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  const clients = new Map<WebSocket, { userId?: number, eventId?: number }>();

  wss.on('connection', (ws) => {
    clients.set(ws, {});

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'JOIN_EVENT') {
          clients.set(ws, { userId: data.userId, eventId: data.eventId });
        }
        
        if (data.type === 'UPDATE_LOCATION') {
          const { userId, eventId, teamId, lat, lng, username, avatar_url, team_color } = data;
          
          await db.insert(schema.userLocations).values({
            userId,
            maraudeEventId: eventId,
            teamId,
            lat,
            lng,
            lastUpdated: new Date()
          }).onConflictDoUpdate({
            target: [schema.userLocations.userId, schema.userLocations.maraudeEventId],
            set: {
              teamId,
              lat,
              lng,
              lastUpdated: new Date()
            }
          });
          
          const broadcastData = JSON.stringify({
            type: 'LOCATION_UPDATED',
            userId,
            eventId,
            teamId,
            lat,
            lng,
            username,
            avatarUrl: avatar_url,
            teamColor: team_color
          });
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientInfo = clients.get(client);
              if (clientInfo?.eventId === eventId) {
                client.send(broadcastData);
              }
            }
          });
        }

        if (data.type === 'STOP_SHARING') {
          const { userId, eventId } = data;
          if (eventId) {
            await db.delete(schema.userLocations).where(and(eq(schema.userLocations.userId, userId), eq(schema.userLocations.maraudeEventId, eventId)));
          } else {
            await db.delete(schema.userLocations).where(eq(schema.userLocations.userId, userId));
          }
          
          const broadcastData = JSON.stringify({
            type: 'LOCATION_REMOVED',
            userId,
            eventId
          });
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              const clientInfo = clients.get(client);
              if (!eventId || clientInfo?.eventId === eventId) {
                client.send(broadcastData);
              }
            }
          });
        }
      } catch (e) {
        console.error("WS error:", e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
