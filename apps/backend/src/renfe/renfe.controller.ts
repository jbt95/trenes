import {
  Controller,
  Dependencies,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { RenfeHistoryService } from "./renfe-history.service";
import type {
  RenfeAlertDto,
  RenfeInsightsDto,
  RenfeVehiclePositionDto,
} from "./renfe.service";
import { RenfeService } from "./renfe.service";

@Controller("renfe")
@Dependencies(RenfeService, RenfeHistoryService)
export class RenfeController {
  constructor(
    private readonly renfeService: RenfeService,
    private readonly historyService: RenfeHistoryService
  ) {}

  @Get("vehicle-positions")
  async getVehiclePositions(): Promise<readonly RenfeVehiclePositionDto[]> {
    try {
      return await this.renfeService.getVehiclePositions();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to fetch Renfe vehicle positions";
      throw new InternalServerErrorException(message);
    }
  }

  @Get("alerts")
  async getAlerts(): Promise<readonly RenfeAlertDto[]> {
    try {
      return await this.renfeService.getAlerts();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch Renfe alerts";
      throw new InternalServerErrorException(message);
    }
  }

  @Get("insights")
  async getInsights(): Promise<RenfeInsightsDto> {
    try {
      return await this.renfeService.getInsights();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to compute Renfe insights";
      throw new InternalServerErrorException(message);
    }
  }

  @Get("history/summary")
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
    try {
      return await this.historyService.getHistorySummary();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to get history summary";
      throw new InternalServerErrorException(message);
    }
  }

  @Get("history/snapshots")
  async getSnapshots(@Req() req: Request): Promise<
    readonly {
      id: string;
      timestamp: number;
      vehicleCount: number;
      alertCount: number;
    }[]
  > {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    try {
      return await this.historyService.getSnapshotList(
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to get snapshots";
      throw new InternalServerErrorException(message);
    }
  }

  @Get("history/snapshots/:id")
  async getSnapshotById(@Param("id") id: string): Promise<{
    id: string;
    timestamp: number;
    vehicleCount: number;
    alertCount: number;
    vehicles: readonly {
      id: string;
      label: string | null;
      routeId: string | null;
      latitude: number;
      longitude: number;
    }[];
    alerts: readonly {
      id: string;
      header: string | null;
      effect: string | null;
      isActive: boolean;
    }[];
  }> {
    try {
      const snapshot = await this.historyService.loadSnapshotById(id);
      if (!snapshot) {
        throw new NotFoundException(`Snapshot ${id} not found`);
      }

      const now = Math.floor(Date.now() / 1000);
      return {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        vehicleCount: snapshot.vehicles.length,
        alertCount: snapshot.alerts.length,
        vehicles: snapshot.vehicles.map((v) => ({
          id: v.id,
          label: v.label,
          routeId: v.routeId,
          latitude: v.latitude,
          longitude: v.longitude,
        })),
        alerts: snapshot.alerts.map((a) => ({
          id: a.id,
          header: a.header,
          effect: a.effect,
          isActive:
            a.start !== null &&
            a.start <= now &&
            (a.end === null || a.end > now),
        })),
      };
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      const message =
        err instanceof Error ? err.message : "Failed to get snapshot";
      throw new InternalServerErrorException(message);
    }
  }

  @Post("history/capture")
  async captureSnapshot(): Promise<{ success: boolean; id: string }> {
    try {
      const [vehicles, alerts, insights] = await Promise.all([
        this.renfeService.getVehiclePositions(),
        this.renfeService.getAlerts(),
        this.renfeService.getInsights(),
      ]);
      const id = await this.historyService.storeSnapshot(
        insights,
        vehicles,
        alerts
      );
      return { success: true, id };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to capture snapshot";
      throw new InternalServerErrorException(message);
    }
  }
}
