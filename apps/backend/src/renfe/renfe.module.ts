import { Module } from "@nestjs/common";
import { RenfeController } from "./renfe.controller";
import { RenfeCronService } from "./renfe-cron.service";
import { RenfeHistoryService } from "./renfe-history.service";
import { RenfeService } from "./renfe.service";

@Module({
  controllers: [RenfeController],
  providers: [RenfeService, RenfeHistoryService, RenfeCronService],
  exports: [RenfeHistoryService],
})
export class RenfeModule {}
