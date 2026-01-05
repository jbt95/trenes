import { Controller, Dependencies, Get } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
@Dependencies(AppService)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  getHealth(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
