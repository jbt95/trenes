import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { RenfeHistoryService } from "./renfe-history.service";
import type { RenfeService } from "./renfe.service";

@Injectable()
export class RenfeCronService {
  private readonly logger = new Logger(RenfeCronService.name);

  constructor(
    private readonly renfeService: RenfeService,
    private readonly historyService: RenfeHistoryService,
  ) {}

  /**
   * Capture a snapshot every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async captureSnapshot(): Promise<string> {
    this.logger.log("Running scheduled snapshot capture...");

    try {
      const [vehicles, alerts, insights] = await Promise.all([
        this.renfeService.getVehiclePositions(),
        this.renfeService.getAlerts(),
        this.renfeService.getInsights(),
      ]);
      const id = await this.historyService.storeSnapshot(insights, vehicles, alerts);
      this.logger.log(`Snapshot captured successfully: ${id}`);
      return id;
    } catch (error) {
      this.logger.error(`Failed to capture snapshot: ${error}`);
      throw error;
    }
  }

  /**
   * Cleanup old snapshots once a day at 3 AM
   */
  @Cron("0 3 * * *")
  async cleanupOldSnapshots(): Promise<void> {
    this.logger.log("Running scheduled cleanup...");

    try {
      const deleted = await this.historyService.cleanupOldSnapshots(30);
      this.logger.log(`Cleanup completed, deleted ${deleted} old snapshots`);
    } catch (error) {
      this.logger.error(`Failed to cleanup snapshots: ${error}`);
    }
  }

  /**
   * Manually trigger a snapshot capture
   */
  async manualCapture(): Promise<void> {
    this.logger.log("Manual snapshot capture triggered");
    await this.captureSnapshot();
  }
}
