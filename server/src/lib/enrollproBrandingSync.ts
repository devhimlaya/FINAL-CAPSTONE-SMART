/**
 * enrollproBrandingSync.ts
 *
 * Service that syncs school branding (logo, colors, school name) from
 * EnrollPro's public settings endpoint into SMART's local database.
 *
 * Called by:
 *  - POST /api/admin/settings/sync-enrollpro  (on-demand)
 *  - Server startup scheduler (auto-sync)
 */

import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { prisma } from "./prisma";
import { getEnrollProPublicSettings } from "./enrollproClient";
import { broadcastSettingsUpdate } from "./sseManager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick 3 brand colors from an EnrollPro palette (skip near-white and near-black). */
export function pickColorsFromPalette(
  palette: Array<{ hex: string }>
): { primary: string; secondary: string; accent: string } {
  const vibrant = palette
    .filter((c) => {
      if (!c.hex || c.hex.length < 7) return false;
      const r = parseInt(c.hex.slice(1, 3), 16);
      const g = parseInt(c.hex.slice(3, 5), 16);
      const b = parseInt(c.hex.slice(5, 7), 16);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return lum > 30 && lum < 210;
    })
    .map((c) => c.hex);
  return {
    primary: vibrant[0] ?? "#10b981",
    secondary: vibrant[1] ?? "#34d399",
    accent: vibrant[2] ?? "#6ee7b7",
  };
}

/** Download the school logo from EnrollPro and save it locally. */
export async function downloadLogoFromEnrollPro(
  logoRelativePath: string,
  uploadDir: string
): Promise<string | null> {
  try {
    const baseHost = (
      process.env.ENROLLPRO_BASE_URL ?? "https://dev-jegs.buru-degree.ts.net/api"
    ).replace(/\/api$/, "");
    const imageUrl = `${baseHost}${logoRelativePath}`;
    const ext = path.extname(logoRelativePath) || ".png";
    const filename = `logo-enrollpro-sync${ext}`;
    const filepath = path.join(uploadDir, filename);

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const parsed = new URL(imageUrl);
      const lib = parsed.protocol === "https:" ? https : http;
      const reqOpts: Record<string, any> = {
        hostname: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port) : parsed.protocol === "https:" ? 443 : 80,
        path: parsed.pathname,
        method: "GET",
        rejectUnauthorized: false, // Allow Tailscale internal certs
      };
      const req = (lib as any).request(reqOpts, (res: any) => {
        if (res.statusCode >= 400) {
          reject(new Error(`Logo download failed: HTTP ${res.statusCode}`));
          return;
        }
        const ws = fs.createWriteStream(filepath);
        res.pipe(ws);
        ws.on("finish", resolve);
        ws.on("error", reject);
      });
      req.on("error", (err: Error) => reject(err));
      req.setTimeout(20000, () => {
        req.destroy(new Error("Logo download timeout"));
      });
      req.end();
    });

    return `/uploads/${filename}`;
  } catch (err) {
    console.error("[BrandingSync] Failed to download logo:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

export async function syncEnrollProBranding(uploadDir?: string): Promise<object> {
  const epSettings = await getEnrollProPublicSettings();
  const resolvedUploadDir = uploadDir ?? path.join(__dirname, "../../uploads");

  // Pick colors from palette; fall back to neutral green if palette is empty
  const colors =
    epSettings.colorScheme?.palette?.length
      ? pickColorsFromPalette(epSettings.colorScheme.palette)
      : { primary: "#10b981", secondary: "#34d399", accent: "#6ee7b7" };

  // Download logo locally so it's served by SMART
  const logoUrl = epSettings.logoUrl
    ? await downloadLogoFromEnrollPro(epSettings.logoUrl, resolvedUploadDir)
    : null;

  const updateData: Record<string, any> = {
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    accentColor: colors.accent,
    lastEnrollProSync: new Date(),
  };

  if (epSettings.schoolName) updateData.schoolName = epSettings.schoolName;
  if (logoUrl) updateData.logoUrl = logoUrl;
  if (epSettings.activeSchoolYearLabel) updateData.currentSchoolYear = epSettings.activeSchoolYearLabel;
  if (epSettings.depedEmail) updateData.email = epSettings.depedEmail;

  const settings = await prisma.systemSettings.upsert({
    where: { id: "main" },
    update: updateData,
    create: { id: "main", ...updateData },
  });

  // Push to all connected SSE clients so the UI updates immediately
  broadcastSettingsUpdate(settings);

  return settings;
}

// ---------------------------------------------------------------------------
// Background scheduler
// ---------------------------------------------------------------------------

// NOTE: Scheduling is now handled by syncCoordinator.ts.
// Call syncEnrollProBranding() directly; do not add a scheduler here.
