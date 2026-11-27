import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db, isValidPostgresUrl } from './src/db/index.ts';
import {
  adminCredentials,
  inquiries,
  mediaUploads,
  plots,
  reviews,
  siteSettings,
  siteVisits,
} from './src/db/schema.ts';
import {
  DEFAULT_SETTINGS,
  INITIAL_PLOTS,
  INITIAL_REVIEWS,
  ensureDatabaseSeeded,
} from './src/db/seed.ts';
import {
  authenticateWithSupabase,
  getSupabaseConfig,
  hashPassword,
  isEnvAdminConfigured,
  isSupabaseAuthConfigured,
  requireAdmin,
  requireAuth,
  safeStringEqual,
  signAdminToken,
  verifyPassword,
  verifySupabaseAccessToken,
} from './src/middleware/auth.ts';
import type { AuthRequest } from './src/middleware/auth.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '18mb' }));

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isSafeHttpUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeImageList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((item): item is string => typeof item === 'string' && isSafeHttpUrl(item.trim()))
    .map((item) => item.trim())
    .slice(0, 12);
}

function sanitizeStringList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 12);
}

const VALID_PLOT_STATUSES = ['Available', 'Reserved', 'Sold'] as const;
const VALID_INQUIRY_STATUSES = ['New', 'Contacted', 'Closed'] as const;
const VALID_VISIT_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'] as const;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Public runtime configuration
app.get('/api/public-config', (_req, res) => {
  const sb = getSupabaseConfig();
  res.json({
    googleMapsApiKey:
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    supabaseUrl: sb?.url || '',
    supabaseAnonKey: sb?.anonKey || '',
  });
});

// Live deployment health check
app.get('/api/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      ok: true,
      database: 'connected',
      supabaseConfigured: isSupabaseAuthConfigured(),
      databaseUrlConfigured: isValidPostgresUrl(process.env.DATABASE_URL),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ ok: false, database: 'error' });
  }
});

// Public site settings
app.get('/api/settings', async (_req, res) => {
  try {
    await ensureDatabaseSeeded();
    const rows = await db.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }
    res.json(settingsMap);
  } catch (error) {
    console.error('Failed to fetch site settings (using fallback):', error);
    res.json(DEFAULT_SETTINGS);
  }
});

// Public plots list with server-side filters
app.get('/api/plots', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const conditions = [];
    const { location, status, minPrice, maxPrice, minSize, maxSize, q } = req.query;

    if (typeof location === 'string' && location.trim() && location !== 'All') {
      conditions.push(eq(plots.location, location.trim()));
    }
    if (
      typeof status === 'string' &&
      VALID_PLOT_STATUSES.includes(status as (typeof VALID_PLOT_STATUSES)[number])
    ) {
      conditions.push(eq(plots.status, status));
    }
    if (typeof minPrice === 'string' && !Number.isNaN(Number(minPrice)) && Number(minPrice) > 0) {
      conditions.push(gte(plots.price, Number(minPrice)));
    }
    if (typeof maxPrice === 'string' && !Number.isNaN(Number(maxPrice)) && Number(maxPrice) > 0) {
      conditions.push(lte(plots.price, Number(maxPrice)));
    }
    if (typeof minSize === 'string' && !Number.isNaN(Number(minSize)) && Number(minSize) > 0) {
      conditions.push(gte(plots.areaDecimals, Number(minSize)));
    }
    if (typeof maxSize === 'string' && !Number.isNaN(Number(maxSize)) && Number(maxSize) > 0) {
      conditions.push(lte(plots.areaDecimals, Number(maxSize)));
    }
    if (typeof q === 'string' && q.trim()) {
      const pattern = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(plots.name, pattern),
          ilike(plots.location, pattern),
          ilike(plots.plotCode, pattern),
          ilike(plots.description, pattern)
        )
      );
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(plots)
            .where(and(...conditions))
            .orderBy(desc(plots.featured), plots.id)
        : await db.select().from(plots).orderBy(desc(plots.featured), plots.id);

    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch plots (using fallback):', error);
    let result = INITIAL_PLOTS.map((p, idx) => ({ id: idx + 1, ...p, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    const { location, status, minPrice, maxPrice, minSize, maxSize, q } = req.query;
    if (typeof location === 'string' && location.trim() && location !== 'All') {
      result = result.filter(p => p.location === location.trim());
    }
    if (typeof status === 'string' && VALID_PLOT_STATUSES.includes(status as any)) {
      result = result.filter(p => p.status === status);
    }
    if (typeof minPrice === 'string' && !Number.isNaN(Number(minPrice))) {
      result = result.filter(p => p.price >= Number(minPrice));
    }
    if (typeof maxPrice === 'string' && !Number.isNaN(Number(maxPrice))) {
      result = result.filter(p => p.price <= Number(maxPrice));
    }
    if (typeof minSize === 'string' && !Number.isNaN(Number(minSize))) {
      result = result.filter(p => p.areaDecimals >= Number(minSize));
    }
    if (typeof maxSize === 'string' && !Number.isNaN(Number(maxSize))) {
      result = result.filter(p => p.areaDecimals <= Number(maxSize));
    }
    if (typeof q === 'string' && q.trim()) {
      const qLower = q.trim().toLowerCase();
      result = result.filter(p => `${p.plotCode} ${p.name} ${p.location} ${p.description}`.toLowerCase().includes(qLower));
    }
    res.json(result);
  }
});

// Single plot details by numeric ID or plotCode
app.get('/api/plots/:idOrCode', async (req, res) => {
  try {
    await ensureDatabaseSeeded();
    const param = req.params.idOrCode;
    const numericId = Number(param);
    const rows =
      Number.isInteger(numericId) && numericId > 0
        ? await db.select().from(plots).where(eq(plots.id, numericId))
        : await db.select().from(plots).where(eq(plots.plotCode, param));

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Plot not found.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Failed to fetch plot details:', error);
    res.status(500).json({ error: 'Unable to load plot details.' });
  }
});

// Public reviews
app.get('/api/reviews', async (_req, res) => {
  try {
    await ensureDatabaseSeeded();
    const rows = await db
      .select()
      .from(reviews)
      .where(eq(reviews.isPublished, true))
      .orderBy(desc(reviews.createdAt));
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch reviews (using fallback):', error);
    res.json(
      INITIAL_REVIEWS.map((r, idx) => ({
        id: idx + 1,
        ...r,
        createdAt: new Date().toISOString(),
      }))
    );
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { customerName, customerRole, rating, comment, plotPurchased } = req.body ?? {};
    if (
      typeof customerName !== 'string' ||
      customerName.trim().length < 2 ||
      typeof comment !== 'string' ||
      comment.trim().length < 10
    ) {
      return res.status(400).json({
        error: 'Please enter your name and a review of at least 10 characters.',
      });
    }
    const parsedRating = Number(rating);
    const cleanRating =
      Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5
        ? parsedRating
        : 5;

    const [created] = await db
      .insert(reviews)
      .values({
        customerName: customerName.trim().slice(0, 120),
        customerRole:
          typeof customerRole === 'string' && customerRole.trim()
            ? customerRole.trim().slice(0, 140)
            : 'Verified Property Owner',
        rating: cleanRating,
        comment: comment.trim().slice(0, 1200),
        plotPurchased:
          typeof plotPurchased === 'string' && plotPurchased.trim()
            ? plotPurchased.trim().slice(0, 80)
            : null,
        isPublished: true,
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to submit review:', error);
    res.status(500).json({ error: 'Unable to submit review right now.' });
  }
});

// Public customer inquiry submission
app.post('/api/inquiries', async (req, res) => {
  try {
    const { plotId, plotName, customerName, customerEmail, customerPhone, message } =
      req.body ?? {};

    if (typeof customerName !== 'string' || customerName.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }
    if (typeof customerEmail !== 'string' || !isValidEmail(customerEmail.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (typeof customerPhone !== 'string' || customerPhone.trim().length < 6) {
      return res.status(400).json({ error: 'Please provide a valid phone or WhatsApp number.' });
    }
    if (typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ error: 'Please enter your inquiry message.' });
    }

    let validPlotId: number | null = null;
    let resolvedPlotName: string | null =
      typeof plotName === 'string' && plotName.trim() ? plotName.trim().slice(0, 160) : null;

    if (plotId !== undefined && plotId !== null && Number(plotId) > 0) {
      const found = await db.select().from(plots).where(eq(plots.id, Number(plotId)));
      if (found.length > 0) {
        validPlotId = found[0].id;
        resolvedPlotName = `${found[0].plotCode} — ${found[0].name}`;
      }
    }

    const [created] = await db
      .insert(inquiries)
      .values({
        plotId: validPlotId,
        plotName: resolvedPlotName,
        customerName: customerName.trim().slice(0, 120),
        customerEmail: customerEmail.trim().slice(0, 160),
        customerPhone: customerPhone.trim().slice(0, 40),
        message: message.trim().slice(0, 2000),
        status: 'New',
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to submit inquiry:', error);
    res.status(500).json({ error: 'Unable to submit your inquiry.' });
  }
});

// Public site visit booking
app.post('/api/site-visits', async (req, res) => {
  try {
    const {
      plotId,
      plotName,
      visitorName,
      visitorEmail,
      visitorPhone,
      preferredDate,
      preferredTime,
      guestsCount,
      notes,
    } = req.body ?? {};

    if (typeof visitorName !== 'string' || visitorName.trim().length < 2) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }
    if (typeof visitorEmail !== 'string' || !isValidEmail(visitorEmail.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (typeof visitorPhone !== 'string' || visitorPhone.trim().length < 6) {
      return res.status(400).json({ error: 'Please provide a valid contact phone number.' });
    }
    if (typeof preferredDate !== 'string' || !preferredDate.trim()) {
      return res.status(400).json({ error: 'Please select a preferred visit date.' });
    }
    if (typeof preferredTime !== 'string' || !preferredTime.trim()) {
      return res.status(400).json({ error: 'Please select a preferred time slot.' });
    }

    let validPlotId: number | null = null;
    let resolvedPlotName: string | null =
      typeof plotName === 'string' && plotName.trim() ? plotName.trim().slice(0, 160) : null;

    if (plotId !== undefined && plotId !== null && Number(plotId) > 0) {
      const found = await db.select().from(plots).where(eq(plots.id, Number(plotId)));
      if (found.length > 0) {
        validPlotId = found[0].id;
        resolvedPlotName = `${found[0].plotCode} — ${found[0].name}`;
      }
    }

    const parsedGuests = Number(guestsCount);
    const cleanGuests =
      Number.isInteger(parsedGuests) && parsedGuests >= 1 && parsedGuests <= 20
        ? parsedGuests
        : 1;

    const [created] = await db
      .insert(siteVisits)
      .values({
        plotId: validPlotId,
        plotName: resolvedPlotName || 'General Estate Tour',
        visitorName: visitorName.trim().slice(0, 120),
        visitorEmail: visitorEmail.trim().slice(0, 160),
        visitorPhone: visitorPhone.trim().slice(0, 40),
        preferredDate: preferredDate.trim().slice(0, 40),
        preferredTime: preferredTime.trim().slice(0, 40),
        guestsCount: cleanGuests,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 1000) : null,
        status: 'Pending',
      })
      .returning();

    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to book site visit:', error);
    res.status(500).json({ error: 'Unable to schedule site visit.' });
  }
});

// Serve uploaded plot media
app.get('/api/media/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send('Invalid media ID');
    }
    const rows = await db.select().from(mediaUploads).where(eq(mediaUploads.id, id));
    if (rows.length === 0) {
      return res.status(404).send('Image not found');
    }
    const media = rows[0];
    if (!ALLOWED_MIME_TYPES.has(media.mimeType)) {
      return res.status(400).send('Unsupported media type');
    }
    const buffer = Buffer.from(media.dataBase64, 'base64');
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buffer);
  } catch (error) {
    console.error('Error serving media:', error);
    res.status(500).send('Error loading media');
  }
});

// Admin authentication status (never exposes credentials)
app.get('/api/admin/auth-config', async (_req, res) => {
  const supabaseConfigured = isSupabaseAuthConfigured();
  const envCredentialsConfigured = isEnvAdminConfigured();
  const databaseUrlConfigured = isValidPostgresUrl(process.env.DATABASE_URL);

  let hasDbCredentials = false;
  try {
    const existing = await db
      .select({ id: adminCredentials.id })
      .from(adminCredentials)
      .where(eq(adminCredentials.slotKey, 'primary'));
    hasDbCredentials = existing.length > 0;
  } catch {
    hasDbCredentials = false;
  }

  const credentialsReady =
    supabaseConfigured || envCredentialsConfigured || hasDbCredentials;
  const authMode = supabaseConfigured
    ? 'supabase'
    : envCredentialsConfigured
    ? 'env'
    : hasDbCredentials
    ? 'database'
    : 'unconfigured';

  res.json({
    authMode,
    credentialsReady,
    supabaseConfigured,
    envCredentialsConfigured,
    databaseUrlConfigured,
  });
});

// Admin Username/Email + Password Sign-In (supports Supabase Auth, Env override, and DB scrypt)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password, supabaseAccessToken } = req.body ?? {};

    // 1a. Verify an existing Supabase Auth session token obtained via @supabase/supabase-js
    if (typeof supabaseAccessToken === 'string' && supabaseAccessToken.trim()) {
      if (!isSupabaseAuthConfigured()) {
        return res.status(400).json({ error: 'Supabase Auth is not configured on the server.' });
      }
      const sbResult = await verifySupabaseAccessToken(supabaseAccessToken.trim());
      if (!sbResult.ok) {
        return res.status(sbResult.status).json({ error: sbResult.error });
      }
      const token = signAdminToken(sbResult.user);
      return res.json({ token, user: sbResult.user });
    }

    const identifier = typeof username === 'string' ? username.trim() : '';
    const pass = typeof password === 'string' ? password : '';

    if (!identifier || !pass) {
      return res
        .status(400)
        .json({ error: 'Please enter both username/email and password.' });
    }

    // 1b. Supabase Email + Password Auth when an email is entered
    if (isSupabaseAuthConfigured() && identifier.includes('@')) {
      const sbResult = await authenticateWithSupabase(identifier, pass);
      if (sbResult.ok) {
        const token = signAdminToken(sbResult.user);
        return res.json({ token, user: sbResult.user });
      }
      if (sbResult.status === 403) {
        return res.status(403).json({ error: sbResult.error });
      }
      // If no fallback auth store exists, return the Supabase auth error immediately
      if (!isEnvAdminConfigured()) {
        try {
          const existing = await db
            .select({ id: adminCredentials.id })
            .from(adminCredentials)
            .where(eq(adminCredentials.slotKey, 'primary'));
          if (existing.length === 0) {
            return res.status(sbResult.status).json({ error: sbResult.error });
          }
        } catch {
          return res.status(sbResult.status).json({ error: sbResult.error });
        }
      }
    }

    // 2. Environment-configured Admin credentials
    if (isEnvAdminConfigured()) {
      const expectedUsername = (
        process.env.ADMIN_USERNAME ||
        process.env.ADMIN_EMAIL ||
        'admin'
      )
        .trim()
        .toLowerCase();
      const expectedEmail = (process.env.ADMIN_EMAIL || expectedUsername)
        .trim()
        .toLowerCase();

      const userMatched =
        safeStringEqual(identifier.toLowerCase(), expectedUsername) ||
        safeStringEqual(identifier.toLowerCase(), expectedEmail);

      const envHash = process.env.ADMIN_PASSWORD_HASH?.trim();
      const envPass = process.env.ADMIN_PASSWORD?.trim();
      const passMatched = envHash
        ? verifyPassword(pass, envHash)
        : envPass
        ? safeStringEqual(pass, envPass)
        : false;

      if (!userMatched || !passMatched) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const sessionUser = {
        uid: 'env-admin',
        username: expectedUsername,
        email: expectedEmail,
        role: 'admin' as const,
        provider: 'env' as const,
      };
      const token = signAdminToken(sessionUser);
      return res.json({ token, user: sessionUser });
    }

    // 3. Database-stored scrypt credentials if already configured
    const rows = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.slotKey, 'primary'));

    if (rows.length === 0) {
      return res.status(503).json({
        error:
          'Admin login is not configured yet. Please set ADMIN_USERNAME and ADMIN_PASSWORD (or SUPABASE_URL and SUPABASE_ANON_KEY) in Secrets / .env.',
      });
    }

    const record = rows[0];
    const idLower = identifier.toLowerCase();
    const userMatched =
      safeStringEqual(idLower, record.username.toLowerCase()) ||
      safeStringEqual(idLower, record.email.toLowerCase());
    const passMatched = verifyPassword(pass, record.passwordHash);

    if (!userMatched || !passMatched) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const sessionUser = {
      uid: `db-admin-${record.id}`,
      username: record.username,
      email: record.email,
      role: 'admin' as const,
      provider: 'database' as const,
    };
    const token = signAdminToken(sessionUser);
    return res.json({ token, user: sessionUser });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Unable to sign in right now.' });
  }
});

// Change DB admin username/password while logged in
app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  try {
    if (isSupabaseAuthConfigured() || isEnvAdminConfigured()) {
      return res.status(400).json({
        error:
          'Credentials are managed via Supabase Auth or environment variables in this mode.',
      });
    }

    const { currentPassword, newUsername, newPassword } = req.body ?? {};
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: 'New password must be at least 8 characters long.' });
    }

    const rows = await db
      .select()
      .from(adminCredentials)
      .where(eq(adminCredentials.slotKey, 'primary'));
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Admin credential record not found.' });
    }

    const record = rows[0];
    if (!verifyPassword(currentPassword, record.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const nextUsername =
      typeof newUsername === 'string' && newUsername.trim().length >= 3
        ? newUsername.trim().slice(0, 80)
        : record.username;

    const [updated] = await db
      .update(adminCredentials)
      .set({
        username: nextUsername,
        passwordHash: hashPassword(newPassword),
        updatedAt: new Date(),
      })
      .where(eq(adminCredentials.id, record.id))
      .returning();

    res.json({ updated: true, username: updated.username });
  } catch (error) {
    console.error('Failed to change admin password:', error);
    res.status(500).json({ error: 'Unable to update administrator credentials.' });
  }
});

// Authenticated user status
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    uid: req.dbUser?.uid,
    email: req.dbUser?.email,
    name: req.dbUser?.name,
    role: req.dbUser?.role,
    provider: req.dbUser?.provider,
  });
});

// Admin Dashboard statistics
app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
  try {
    await ensureDatabaseSeeded();
    const allPlots = await db.select().from(plots);
    const [{ totalInquiries }] = await db
      .select({ totalInquiries: sql<number>`count(*)::int` })
      .from(inquiries);
    const [{ newInquiries }] = await db
      .select({ newInquiries: sql<number>`count(*)::int` })
      .from(inquiries)
      .where(eq(inquiries.status, 'New'));
    const [{ totalVisits }] = await db
      .select({ totalVisits: sql<number>`count(*)::int` })
      .from(siteVisits);
    const [{ pendingVisits }] = await db
      .select({ pendingVisits: sql<number>`count(*)::int` })
      .from(siteVisits)
      .where(eq(siteVisits.status, 'Pending'));
    const [{ totalReviews }] = await db
      .select({ totalReviews: sql<number>`count(*)::int` })
      .from(reviews);

    const availablePlots = allPlots.filter((p) => p.status === 'Available').length;
    const reservedPlots = allPlots.filter((p) => p.status === 'Reserved').length;
    const soldPlots = allPlots.filter((p) => p.status === 'Sold').length;
    const availableInventoryValue = allPlots
      .filter((p) => p.status === 'Available')
      .reduce((acc, p) => acc + p.price, 0);

    res.json({
      totalPlots: allPlots.length,
      availablePlots,
      reservedPlots,
      soldPlots,
      availableInventoryValue,
      totalInquiries,
      newInquiries,
      totalVisits,
      pendingVisits,
      totalReviews,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    res.status(500).json({ error: 'Unable to load dashboard statistics.' });
  }
});

// Admin upload multiple plot images
app.post('/api/media/upload', requireAdmin, async (req, res) => {
  try {
    const { files } = req.body ?? {};
    if (!Array.isArray(files) || files.length === 0 || files.length > 8) {
      return res.status(400).json({ error: 'Please select between 1 and 8 image files.' });
    }

    const urls: string[] = [];
    for (const file of files) {
      if (
        !file ||
        typeof file.filename !== 'string' ||
        typeof file.mimeType !== 'string' ||
        typeof file.dataBase64 !== 'string'
      ) {
        return res.status(400).json({ error: 'Invalid image payload.' });
      }
      if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
        return res
          .status(400)
          .json({ error: 'Only JPG, PNG, and WebP images are permitted.' });
      }
      const cleanBase64 = file.dataBase64.replace(/^data:[^;]+;base64,/, '');
      const byteLength = Buffer.byteLength(cleanBase64, 'base64');
      if (byteLength > 4 * 1024 * 1024) {
        return res.status(400).json({ error: 'Each image must be under 4 MB.' });
      }

      const [saved] = await db
        .insert(mediaUploads)
        .values({
          filename: file.filename.slice(0, 120),
          mimeType: file.mimeType,
          dataBase64: cleanBase64,
        })
        .returning({ id: mediaUploads.id });

      urls.push(`/api/media/${saved.id}`);
    }

    res.status(201).json({ urls });
  } catch (error) {
    console.error('Failed to upload media:', error);
    res.status(500).json({ error: 'Failed to upload property photos.' });
  }
});

// Admin Plot CRUD
app.post('/api/plots', requireAdmin, async (req, res) => {
  try {
    const body = req.body ?? {};
    const plotCode = typeof body.plotCode === 'string' ? body.plotCode.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const location = typeof body.location === 'string' ? body.location.trim() : '';
    const dimensions = typeof body.dimensions === 'string' ? body.dimensions.trim() : '';
    const roadAccess = typeof body.roadAccess === 'string' ? body.roadAccess.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    const areaDecimals = Number(body.areaDecimals);
    const price = Math.round(Number(body.price));
    const pricePerDecimal =
      Number(body.pricePerDecimal) > 0
        ? Math.round(Number(body.pricePerDecimal))
        : areaDecimals > 0
        ? Math.round(price / areaDecimals)
        : 0;

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!plotCode || !name || !location || !dimensions || !roadAccess || !description) {
      return res.status(400).json({ error: 'All plot specification fields are required.' });
    }
    if (Number.isNaN(areaDecimals) || areaDecimals <= 0) {
      return res.status(400).json({ error: 'Total area in decimals must be greater than 0.' });
    }
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
    }

    const status = VALID_PLOT_STATUSES.includes(body.status) ? body.status : 'Available';
    const googleMapsUrl =
      typeof body.googleMapsUrl === 'string' && isSafeHttpUrl(body.googleMapsUrl.trim())
        ? body.googleMapsUrl.trim()
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    const totalArea =
      typeof body.totalArea === 'string' && body.totalArea.trim()
        ? body.totalArea.trim()
        : `${areaDecimals} Decimals (${Math.round(areaDecimals * 435.6).toLocaleString()} sq ft)`;

    const images = sanitizeImageList(body.images);
    const highlights = sanitizeStringList(body.highlights);

    const [created] = await db
      .insert(plots)
      .values({
        plotCode: plotCode.slice(0, 40),
        name: name.slice(0, 160),
        location: location.slice(0, 140),
        totalArea: totalArea.slice(0, 120),
        areaDecimals,
        dimensions: dimensions.slice(0, 100),
        price,
        pricePerDecimal,
        roadAccess: roadAccess.slice(0, 140),
        description: description.slice(0, 3000),
        status,
        featured: Boolean(body.featured),
        latitude,
        longitude,
        googleMapsUrl,
        images:
          images.length > 0
            ? images
            : ['/src/assets/images/plot_valley_meadow_1795758692675.jpg'],
        highlights,
      })
      .returning();

    res.status(201).json(created);
  } catch (error: unknown) {
    console.error('Failed to create plot:', error);
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      return res.status(409).json({ error: 'A plot with this Plot ID already exists.' });
    }
    res.status(500).json({ error: 'Unable to create plot.' });
  }
});

app.put('/api/plots/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid plot ID.' });
    }

    const existing = await db.select().from(plots).where(eq(plots.id, id));
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Plot not found.' });
    }
    const cur = existing[0];
    const body = req.body ?? {};

    const areaDecimals =
      body.areaDecimals !== undefined ? Number(body.areaDecimals) : cur.areaDecimals;
    const price = body.price !== undefined ? Math.round(Number(body.price)) : cur.price;
    const pricePerDecimal =
      body.pricePerDecimal !== undefined && Number(body.pricePerDecimal) > 0
        ? Math.round(Number(body.pricePerDecimal))
        : areaDecimals > 0
        ? Math.round(price / areaDecimals)
        : cur.pricePerDecimal;
    const latitude = body.latitude !== undefined ? Number(body.latitude) : cur.latitude;
    const longitude = body.longitude !== undefined ? Number(body.longitude) : cur.longitude;

    const status = VALID_PLOT_STATUSES.includes(body.status) ? body.status : cur.status;
    const googleMapsUrl =
      typeof body.googleMapsUrl === 'string' && isSafeHttpUrl(body.googleMapsUrl.trim())
        ? body.googleMapsUrl.trim()
        : cur.googleMapsUrl;

    const [updated] = await db
      .update(plots)
      .set({
        plotCode:
          typeof body.plotCode === 'string' && body.plotCode.trim()
            ? body.plotCode.trim().slice(0, 40)
            : cur.plotCode,
        name:
          typeof body.name === 'string' && body.name.trim()
            ? body.name.trim().slice(0, 160)
            : cur.name,
        location:
          typeof body.location === 'string' && body.location.trim()
            ? body.location.trim().slice(0, 140)
            : cur.location,
        totalArea:
          typeof body.totalArea === 'string' && body.totalArea.trim()
            ? body.totalArea.trim().slice(0, 120)
            : `${areaDecimals} Decimals (${Math.round(areaDecimals * 435.6).toLocaleString()} sq ft)`,
        areaDecimals: Number.isNaN(areaDecimals) ? cur.areaDecimals : areaDecimals,
        dimensions:
          typeof body.dimensions === 'string' && body.dimensions.trim()
            ? body.dimensions.trim().slice(0, 100)
            : cur.dimensions,
        price: Number.isNaN(price) ? cur.price : price,
        pricePerDecimal: Number.isNaN(pricePerDecimal)
          ? cur.pricePerDecimal
          : pricePerDecimal,
        roadAccess:
          typeof body.roadAccess === 'string' && body.roadAccess.trim()
            ? body.roadAccess.trim().slice(0, 140)
            : cur.roadAccess,
        description:
          typeof body.description === 'string' && body.description.trim()
            ? body.description.trim().slice(0, 3000)
            : cur.description,
        status,
        featured: body.featured !== undefined ? Boolean(body.featured) : cur.featured,
        latitude: Number.isNaN(latitude) ? cur.latitude : latitude,
        longitude: Number.isNaN(longitude) ? cur.longitude : longitude,
        googleMapsUrl,
        images: body.images !== undefined ? sanitizeImageList(body.images) : cur.images,
        highlights:
          body.highlights !== undefined ? sanitizeStringList(body.highlights) : cur.highlights,
        updatedAt: new Date(),
      })
      .where(eq(plots.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Failed to update plot:', error);
    res.status(500).json({ error: 'Unable to update plot.' });
  }
});

app.delete('/api/plots/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid plot ID.' });
    }
    const deleted = await db.delete(plots).where(eq(plots.id, id)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Plot not found.' });
    }
    res.json({ deleted: true, id });
  } catch (error) {
    console.error('Failed to delete plot:', error);
    res.status(500).json({ error: 'Unable to delete plot.' });
  }
});

// Admin Inquiries management
app.get('/api/admin/inquiries', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt));
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch inquiries:', error);
    res.status(500).json({ error: 'Unable to load customer inquiries.' });
  }
});

app.patch('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    if (
      !Number.isInteger(id) ||
      id <= 0 ||
      !VALID_INQUIRY_STATUSES.includes(status)
    ) {
      return res.status(400).json({ error: 'Invalid inquiry ID or status.' });
    }
    const [updated] = await db
      .update(inquiries)
      .set({ status })
      .where(eq(inquiries.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Inquiry not found.' });
    res.json(updated);
  } catch (error) {
    console.error('Failed to update inquiry:', error);
    res.status(500).json({ error: 'Unable to update inquiry status.' });
  }
});

app.delete('/api/admin/inquiries/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid inquiry ID.' });
    }
    await db.delete(inquiries).where(eq(inquiries.id, id));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete inquiry:', error);
    res.status(500).json({ error: 'Unable to delete inquiry.' });
  }
});

// Admin Site Visits management
app.get('/api/admin/site-visits', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(siteVisits).orderBy(desc(siteVisits.createdAt));
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch site visits:', error);
    res.status(500).json({ error: 'Unable to load site visit bookings.' });
  }
});

app.patch('/api/admin/site-visits/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body ?? {};
    if (!Number.isInteger(id) || id <= 0 || !VALID_VISIT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking ID or status.' });
    }
    const [updated] = await db
      .update(siteVisits)
      .set({ status })
      .where(eq(siteVisits.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Site visit booking not found.' });
    res.json(updated);
  } catch (error) {
    console.error('Failed to update site visit:', error);
    res.status(500).json({ error: 'Unable to update booking status.' });
  }
});

app.delete('/api/admin/site-visits/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid booking ID.' });
    }
    await db.delete(siteVisits).where(eq(siteVisits.id, id));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete site visit:', error);
    res.status(500).json({ error: 'Unable to delete booking.' });
  }
});

// Admin Reviews management
app.get('/api/admin/reviews', requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    res.json(rows);
  } catch (error) {
    console.error('Failed to fetch all reviews:', error);
    res.status(500).json({ error: 'Unable to load reviews.' });
  }
});

app.patch('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { isPublished } = req.body ?? {};
    if (!Number.isInteger(id) || id <= 0 || typeof isPublished !== 'boolean') {
      return res.status(400).json({ error: 'Invalid review update payload.' });
    }
    const [updated] = await db
      .update(reviews)
      .set({ isPublished })
      .where(eq(reviews.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Review not found.' });
    res.json(updated);
  } catch (error) {
    console.error('Failed to update review:', error);
    res.status(500).json({ error: 'Unable to update review.' });
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid review ID.' });
    }
    await db.delete(reviews).where(eq(reviews.id, id));
    res.json({ deleted: true });
  } catch (error) {
    console.error('Failed to delete review:', error);
    res.status(500).json({ error: 'Unable to delete review.' });
  }
});

// Admin Website Content & Settings management
app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updates = req.body ?? {};
    if (typeof updates !== 'object' || updates === null) {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }

    const allowedKeys = new Set([
      'companyName',
      'tagline',
      'heroHeadline',
      'heroSubheadline',
      'heroImage',
      'aboutTitle',
      'aboutBody',
      'whatsappNumber',
      'contactEmail',
      'contactPhone',
      'officeAddress',
      'currencySymbol',
      'socialFacebook',
      'socialInstagram',
      'socialLinkedIn',
      'socialYoutube',
    ]);

    for (const [key, val] of Object.entries(updates)) {
      if (!allowedKeys.has(key) || typeof val !== 'string') continue;
      if (
        (key === 'heroImage' ||
          key === 'socialFacebook' ||
          key === 'socialInstagram' ||
          key === 'socialLinkedIn' ||
          key === 'socialYoutube') &&
        val.trim() &&
        !isSafeHttpUrl(val.trim())
      ) {
        return res.status(400).json({ error: `Invalid URL provided for ${key}.` });
      }
      await db
        .insert(siteSettings)
        .values({ key, value: val.trim(), updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: val.trim(), updatedAt: new Date() },
        });
    }

    const rows = await db.select().from(siteSettings);
    const settingsMap: Record<string, string> = {};
    for (const row of rows) {
      settingsMap[row.key] = row.value;
    }
    res.json(settingsMap);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Unable to save website content settings.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.all('/api/*', (_req, res) => {
      res.status(404).json({ error: 'API route not found.' });
    });
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
