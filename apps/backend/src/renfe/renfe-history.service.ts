import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  RenfeInsightsDto,
  RenfeVehiclePositionDto,
  RenfeAlertDto,
} from "./renfe.service";

export type HistorySnapshot = {
  readonly id: string;
  readonly timestamp: number;
  readonly totals: RenfeInsightsDto["totals"];
  readonly alertsByEffect: RenfeInsightsDto["alertsByEffect"];
  readonly alertsByCause: RenfeInsightsDto["alertsByCause"];
  readonly vehiclesByStatus: RenfeInsightsDto["vehiclesByStatus"];
  readonly vehicles: readonly {
    id: string;
    label: string | null;
    routeId: string | null;
    tripId: string | null;
    latitude: number;
    longitude: number;
    currentStatus: string | null;
  }[];
  readonly alerts: readonly {
    id: string;
    header: string | null;
    effect: string | null;
    cause: string | null;
    start: number | null;
    end: number | null;
  }[];
};

export type HistoryIndex = {
  readonly snapshots: readonly {
    readonly id?: string; // Optional for backward compatibility
    readonly timestamp: number;
    readonly filename: string;
    readonly vehicleCount?: number; // Optional for backward compatibility
    readonly alertCount?: number; // Optional for backward compatibility
  }[];
};

const DATA_DIR = path.join(process.cwd(), "data", "history");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

@Injectable()
export class RenfeHistoryService implements OnModuleInit {
  private readonly logger = new Logger(RenfeHistoryService.name);

  onModuleInit(): void {
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      this.logger.log(`Created history data directory: ${DATA_DIR}`);
    }
  }

  /**
   * Store a snapshot of the current insights data with vehicles and alerts
   */
  async storeSnapshot(
    insights: RenfeInsightsDto,
    vehicles: readonly RenfeVehiclePositionDto[],
    alerts: readonly RenfeAlertDto[]
  ): Promise<string> {
    this.ensureDataDir();

    const timestamp = Math.floor(Date.now() / 1000);
    const id = `${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `snapshot-${id}.json`;
    const filepath = path.join(DATA_DIR, filename);

    const snapshot: HistorySnapshot = {
      id,
      timestamp,
      totals: insights.totals,
      alertsByEffect: insights.alertsByEffect,
      alertsByCause: insights.alertsByCause,
      vehiclesByStatus: insights.vehiclesByStatus,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        label: v.label,
        routeId: v.routeId,
        tripId: v.tripId,
        latitude: v.latitude,
        longitude: v.longitude,
        currentStatus: v.currentStatus,
      })),
      alerts: alerts.map((a) => ({
        id: a.id,
        header: a.header,
        effect: a.effect,
        cause: a.cause,
        start: a.start,
        end: a.end,
      })),
    };

    // Write snapshot file
    await fs.promises.writeFile(filepath, JSON.stringify(snapshot, null, 2));

    // Update index
    const index = await this.loadIndex();
    const newIndex: HistoryIndex = {
      snapshots: [
        ...index.snapshots,
        {
          id,
          timestamp,
          filename,
          vehicleCount: vehicles.length,
          alertCount: alerts.length,
        },
      ],
    };
    await fs.promises.writeFile(INDEX_FILE, JSON.stringify(newIndex, null, 2));

    this.logger.log(`Stored history snapshot: ${filename}`);
    return id;
  }

  /**
   * Load the history index
   */
  async loadIndex(): Promise<HistoryIndex> {
    try {
      if (fs.existsSync(INDEX_FILE)) {
        const content = await fs.promises.readFile(INDEX_FILE, "utf-8");
        return JSON.parse(content) as HistoryIndex;
      }
    } catch (error) {
      this.logger.warn(`Failed to load history index: ${error}`);
    }
    return { snapshots: [] };
  }

  /**
   * Load a specific snapshot by ID
   */
  async loadSnapshotById(id: string): Promise<HistorySnapshot | null> {
    const index = await this.loadIndex();

    // Try to find by id first, then by matching filename pattern
    let entry = index.snapshots.find((s) => s.id === id);

    if (!entry) {
      // Handle backward compatibility - old entries don't have id field
      // Try to find by filename containing the id
      entry = index.snapshots.find(
        (s) => s.filename === `snapshot-${id}.json` || s.filename.includes(id)
      );
    }

    if (!entry) {
      // Also try matching by timestamp if id looks like a timestamp
      const ts = Number.parseInt(id, 10);
      if (!Number.isNaN(ts)) {
        entry = index.snapshots.find((s) => s.timestamp === ts);
      }
    }

    if (!entry) return null;

    try {
      const filepath = path.join(DATA_DIR, entry.filename);
      const content = await fs.promises.readFile(filepath, "utf-8");
      const snapshot = JSON.parse(content) as HistorySnapshot;

      // Ensure snapshot has id field for backward compatibility
      return {
        ...snapshot,
        id: snapshot.id ?? id,
        vehicles: snapshot.vehicles ?? [],
        alerts: snapshot.alerts ?? [],
      };
    } catch (error) {
      this.logger.warn(`Failed to load snapshot ${id}: ${error}`);
      return null;
    }
  }

  /**
   * Load a specific snapshot by timestamp (legacy support)
   */
  async loadSnapshot(timestamp: number): Promise<HistorySnapshot | null> {
    const index = await this.loadIndex();
    const entry = index.snapshots.find((s) => s.timestamp === timestamp);
    if (!entry) return null;

    try {
      const filepath = path.join(DATA_DIR, entry.filename);
      const content = await fs.promises.readFile(filepath, "utf-8");
      return JSON.parse(content) as HistorySnapshot;
    } catch (error) {
      this.logger.warn(`Failed to load snapshot ${timestamp}: ${error}`);
      return null;
    }
  }

  /**
   * Get all snapshots within a time range (legacy method)
   */
  async getSnapshotsInRange(
    startTimestamp: number,
    endTimestamp: number
  ): Promise<readonly HistorySnapshot[]> {
    const index = await this.loadIndex();
    const filtered = index.snapshots.filter(
      (s) => s.timestamp >= startTimestamp && s.timestamp <= endTimestamp
    );

    const snapshots: HistorySnapshot[] = [];
    for (const entry of filtered.slice(-50)) {
      // Limit to last 50
      const snapshot = await this.loadSnapshotById(entry.id);
      if (snapshot) {
        snapshots.push(snapshot);
      }
    }

    return snapshots;
  }

  /**
   * Get summary statistics over time
   */
  async getHistorySummary(): Promise<{
    readonly totalSnapshots: number;
    readonly oldestSnapshot: string | null;
    readonly newestSnapshot: string | null;
    readonly totalVehicleRecords: number;
    readonly totalAlertRecords: number;
    readonly uniqueVehicleIds: number;
    readonly uniqueAlertIds: number;
    readonly snapshotsByDay: readonly { date: string; count: number }[];
  }> {
    const index = await this.loadIndex();

    if (index.snapshots.length === 0) {
      return {
        totalSnapshots: 0,
        oldestSnapshot: null,
        newestSnapshot: null,
        totalVehicleRecords: 0,
        totalAlertRecords: 0,
        uniqueVehicleIds: 0,
        uniqueAlertIds: 0,
        snapshotsByDay: [],
      };
    }

    // Calculate totals from index
    let totalVehicleRecords = 0;
    let totalAlertRecords = 0;
    const vehicleIds = new Set<string>();
    const alertIds = new Set<string>();
    const snapshotsByDayMap = new Map<string, number>();

    for (const entry of index.snapshots) {
      // Handle backward compatibility - old entries may not have these fields
      totalVehicleRecords += entry.vehicleCount ?? 0;
      totalAlertRecords += entry.alertCount ?? 0;

      // Group by day
      const date = new Date(entry.timestamp * 1000).toISOString().slice(0, 10);
      snapshotsByDayMap.set(date, (snapshotsByDayMap.get(date) ?? 0) + 1);
    }

    // Load some snapshots to get unique IDs (sample from recent ones)
    const sampleSnapshots = index.snapshots.slice(-20);
    for (const entry of sampleSnapshots) {
      // Use id if available, otherwise use filename-based lookup
      const snapshotId =
        entry.id ??
        entry.filename.replace("snapshot-", "").replace(".json", "");
      const snapshot = await this.loadSnapshotById(snapshotId);
      if (snapshot) {
        if (snapshot.vehicles) {
          for (const v of snapshot.vehicles) vehicleIds.add(v.id);
        }
        if (snapshot.alerts) {
          for (const a of snapshot.alerts) alertIds.add(a.id);
        }
      }
    }

    const snapshotsByDay = [...snapshotsByDayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const oldest = index.snapshots[0];
    const newest = index.snapshots[index.snapshots.length - 1];

    return {
      totalSnapshots: index.snapshots.length,
      oldestSnapshot: oldest
        ? new Date(oldest.timestamp * 1000).toISOString()
        : null,
      newestSnapshot: newest
        ? new Date(newest.timestamp * 1000).toISOString()
        : null,
      totalVehicleRecords,
      totalAlertRecords,
      uniqueVehicleIds: vehicleIds.size,
      uniqueAlertIds: alertIds.size,
      snapshotsByDay,
    };
  }

  /**
   * Get list of snapshots (optionally filtered by date range)
   */
  async getSnapshotList(
    from?: Date,
    to?: Date
  ): Promise<
    readonly {
      id: string;
      timestamp: number;
      vehicleCount: number;
      alertCount: number;
    }[]
  > {
    const index = await this.loadIndex();

    let filtered = index.snapshots;

    if (from) {
      const fromTs = Math.floor(from.getTime() / 1000);
      filtered = filtered.filter((s) => s.timestamp >= fromTs);
    }

    if (to) {
      const toTs = Math.floor(to.getTime() / 1000);
      filtered = filtered.filter((s) => s.timestamp <= toTs);
    }

    // Handle backward compatibility - generate id from filename if missing
    return filtered.map((s) => ({
      id: s.id ?? s.filename.replace("snapshot-", "").replace(".json", ""),
      timestamp: s.timestamp,
      vehicleCount: s.vehicleCount ?? 0,
      alertCount: s.alertCount ?? 0,
    }));
  }

  /**
   * Cleanup old snapshots (keep last N days)
   */
  async cleanupOldSnapshots(keepDays = 30): Promise<number> {
    const cutoffTimestamp =
      Math.floor(Date.now() / 1000) - keepDays * 24 * 60 * 60;
    const index = await this.loadIndex();

    const toDelete = index.snapshots.filter(
      (s) => s.timestamp < cutoffTimestamp
    );
    const toKeep = index.snapshots.filter(
      (s) => s.timestamp >= cutoffTimestamp
    );

    let deletedCount = 0;
    for (const entry of toDelete) {
      try {
        const filepath = path.join(DATA_DIR, entry.filename);
        if (fs.existsSync(filepath)) {
          await fs.promises.unlink(filepath);
          deletedCount++;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to delete snapshot ${entry.filename}: ${error}`
        );
      }
    }

    // Update index
    const newIndex: HistoryIndex = { snapshots: toKeep };
    await fs.promises.writeFile(INDEX_FILE, JSON.stringify(newIndex, null, 2));

    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} old snapshots`);
    }

    return deletedCount;
  }
}
