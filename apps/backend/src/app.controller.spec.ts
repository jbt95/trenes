import { beforeEach, describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
    appController = new AppController(appService);
  });

  describe("getHello", () => {
    it("should return hello message", () => {
      const result = appController.getHello();
      expect(result).toBe("Hello from NestJS Backend!");
    });
  });

  describe("getHealth", () => {
    it("should return health status", () => {
      const result = appController.getHealth();
      expect(result).toHaveProperty("status", "ok");
      expect(result).toHaveProperty("timestamp");
    });
  });
});
