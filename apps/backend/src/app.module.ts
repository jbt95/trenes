import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { RenfeModule } from "./renfe/renfe.module";

@Module({
  imports: [ScheduleModule.forRoot(), RenfeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
