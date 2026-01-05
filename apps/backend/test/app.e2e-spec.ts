import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect("Hello from NestJS Backend!");
  });

  it("/health (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/health")
      .expect(200);

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
  });
});
