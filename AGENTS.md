# AI Agent Guidelines

This document provides guidelines for AI agents working on this codebase. Follow these principles to maintain code quality, architecture integrity, and project consistency.

## Core Principles

### 1. Small Incremental Changes

- Make one logical change at a time
- Each change should be independently testable and reviewable
- Avoid massive refactorings; break them into smaller, safe iterations
- Commit often with clear, descriptive messages
- If a feature requires multiple steps, implement and test each step before proceeding

### 2. Clean Code

- **Meaningful Names**: Use descriptive, intention-revealing names for variables, functions, and classes
- **Single Responsibility**: Each function/class should do one thing well
- **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions
- **Small Functions**: Keep functions short and focused (ideally < 20 lines)
- **No Magic Numbers**: Use named constants instead of hardcoded values
- **Comments**: Write self-documenting code; use comments only when "why" isn't obvious
- **Error Handling**: Handle errors explicitly; avoid silent failures
- **Formatting**: Follow the project's biome.json configuration

## Architecture Guidelines

### 3. Domain-Driven Design (DDD)

#### Layers

```
application/      → Use cases, application services, orchestration
domain/          → Entities, value objects, domain services, business logic
infrastructure/  → Database, external APIs, technical implementations, Controllers, DTOs, HTTP handling
```

#### Key Concepts

- **Entities**: Objects with identity and lifecycle (e.g., User, Order)
- **Value Objects**: Immutable objects defined by their attributes (e.g., Email, Money)
- **Aggregates**: Cluster of entities treated as a single unit
- **Repositories**: Abstraction for data access (interface in domain, implementation in infrastructure)
- **Domain Services**: Business logic that doesn't belong to a single entity
- **Domain Events**: Capture something significant that happened in the domain

#### Example Structure

```typescript
// domain/user/user.entity.ts
export class User {
  constructor(
    private readonly id: UserId,
    private email: Email,
    private name: string
  ) {}

  changeEmail(newEmail: Email): void {
    // Business logic here
    this.email = newEmail;
  }
}

// domain/user/user.repository.ts
export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
}

// infrastructure/persistence/user.repository.impl.ts
export class TypeOrmUserRepository implements UserRepository {
  // Implementation details
}
```

### 4. Hexagonal Architecture (Ports & Adapters)

#### Structure

```
Core (Domain + Application)
    ↓ depends on ↓
  Ports (Interfaces)
    ↑ implemented by ↑
Adapters (Infrastructure)
```

#### Principles

- **Core is independent**: Domain and application layers have no external dependencies
- **Ports**: Interfaces defining how the core interacts with the outside world
- **Adapters**: Concrete implementations of ports (database, HTTP, message queues)
- **Direction of dependencies**: Always point inward (infrastructure → application → domain)

#### Example

```typescript
// application/ports/out/email.port.ts
export interface EmailPort {
  send(to: string, subject: string, body: string): Promise<void>;
}

// application/use-cases/register-user.use-case.ts
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailPort: EmailPort // Port, not implementation
  ) {}

  async execute(dto: RegisterUserDto): Promise<void> {
    // Use case logic
    await this.emailPort.send(dto.email, "Welcome", "Hello!");
  }
}

// infrastructure/adapters/email/sendgrid.adapter.ts
export class SendGridEmailAdapter implements EmailPort {
  async send(to: string, subject: string, body: string): Promise<void> {
    // SendGrid implementation
  }
}
```

### 5. Inversion of Dependencies & Dependency Injection

#### Principles

- High-level modules should not depend on low-level modules; both should depend on abstractions
- Abstractions should not depend on details; details should depend on abstractions

#### In NestJS

```typescript
// user.module.ts
@Module({
  providers: [
    RegisterUserUseCase,
    {
      provide: "UserRepository",
      useClass: TypeOrmUserRepository,
    },
    {
      provide: "EmailPort",
      useClass: SendGridEmailAdapter,
    },
  ],
  controllers: [UserController],
})
export class UserModule {}

// register-user.use-case.ts
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject("UserRepository") private readonly userRepository: UserRepository,
    @Inject("EmailPort") private readonly emailPort: EmailPort
  ) {}
}
```

#### Benefits

- Easier testing (inject mocks/stubs)
- Flexible implementation swapping
- Reduced coupling
- Better testability

## Testing Strategy

### 6. Testing Pyramid

```
        /\
       /E2E\         Few, high-value scenarios
      /------\
     /Integration\   Service boundaries, database interactions
    /------------\
   /    Unit      \  Most tests here, fast and focused
  /--------------\
```

### Unit Tests

- Test individual functions/methods in isolation
- Mock all dependencies
- Fast execution (< 1ms per test)
- Focus on business logic and edge cases

```typescript
// register-user.use-case.spec.ts
describe("RegisterUserUseCase", () => {
  let useCase: RegisterUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let emailPort: jest.Mocked<EmailPort>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      save: jest.fn(),
    };
    emailPort = {
      send: jest.fn(),
    };
    useCase = new RegisterUserUseCase(userRepository, emailPort);
  });

  it("should register a new user", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await useCase.execute({ email: "test@test.com", name: "Test" });

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@test.com" })
    );
    expect(emailPort.send).toHaveBeenCalled();
  });

  it("should throw error if user already exists", async () => {
    userRepository.findByEmail.mockResolvedValue(new User(/* ... */));

    await expect(
      useCase.execute({ email: "test@test.com", name: "Test" })
    ).rejects.toThrow("User already exists");
  });
});
```

### Integration Tests

- Test interaction between components
- Use real implementations where practical
- Test database queries, API integrations
- May use test database or in-memory alternatives

```typescript
// user.repository.integration.spec.ts
describe("TypeOrmUserRepository", () => {
  let repository: TypeOrmUserRepository;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await TestDatabase.create();
    repository = new TypeOrmUserRepository(testDb.getConnection());
  });

  afterAll(async () => {
    await testDb.close();
  });

  it("should save and retrieve user", async () => {
    const user = new User(new UserId(), new Email("test@test.com"), "Test");

    await repository.save(user);
    const retrieved = await repository.findById(user.id);

    expect(retrieved).toEqual(user);
  });
});
```

### E2E Tests

- Test complete user workflows
- Test from HTTP request to response
- Use real (test) infrastructure
- Fewer tests, covering critical paths

```typescript
// app.e2e-spec.ts
describe("User Registration (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /users/register should create a new user", () => {
    return request(app.getHttpServer())
      .post("/users/register")
      .send({ email: "test@test.com", name: "Test User" })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty("id");
        expect(res.body.email).toBe("test@test.com");
      });
  });
});
```

## Workflow for AI Agents

### When Adding a New Feature

1. **Understand the requirement**
   - Clarify the business need
   - Identify which domain/bounded context it belongs to

2. **Design the solution**
   - Identify domain entities and value objects
   - Define use cases
   - Identify required ports/adapters

3. **Write tests first (TDD)**
   - Start with unit tests for domain logic
   - Add integration tests for repositories
   - Add E2E tests for critical paths

4. **Implement incrementally**
   - Start with domain entities/value objects
   - Implement use cases
   - Create adapters/infrastructure
   - Wire up with dependency injection
   - Add presentation layer (controllers, DTOs)

5. **Verify**
   - Run all tests
   - Check code formatting
   - Review against these guidelines

### When Refactoring

1. **Ensure tests exist**
   - If no tests, write them first
   - Tests are your safety net

2. **Small steps**
   - One refactoring pattern at a time
   - Run tests after each change

3. **Keep it green**
   - Never commit failing tests
   - If tests break, fix or revert

### When Fixing Bugs

1. **Reproduce the bug**
   - Write a failing test that exposes the bug

2. **Fix minimally**
   - Make the smallest change to fix the issue

3. **Verify**
   - Ensure the test passes
   - Check for side effects

## Code Review Checklist

Before considering a change complete, verify:

- [ ] Follows single responsibility principle
- [ ] Dependencies point inward (infrastructure → application → domain)
- [ ] No business logic in controllers or infrastructure
- [ ] Interfaces (ports) are used instead of concrete implementations
- [ ] All dependencies are injected
- [ ] Tests are written and passing (unit, integration, E2E as appropriate)
- [ ] Code is formatted according to biome.json
- [ ] No console.logs or debug code left behind
- [ ] Error handling is explicit and meaningful
- [ ] Names are clear and intention-revealing

## Common Patterns

### Value Objects

```typescript
export class Email {
  private readonly value: string;

  constructor(email: string) {
    if (!this.isValid(email)) {
      throw new Error("Invalid email format");
    }
    this.value = email;
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  toString(): string {
    return this.value;
  }
}
```

### Repository Pattern

```typescript
// Domain layer - interface
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Infrastructure layer - implementation
@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: UserEntity): User {
    // Map ORM entity to domain model
  }
}
```

### Use Case Pattern

```typescript
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject("UserRepository")
    private readonly userRepository: UserRepository,
    @Inject("EmailPort")
    private readonly emailPort: EmailPort
  ) {}

  async execute(dto: RegisterUserDto): Promise<RegisterUserResponse> {
    // 1. Validate
    const existingUser = await this.userRepository.findByEmail(
      new Email(dto.email)
    );
    if (existingUser) {
      throw new ConflictException("User already exists");
    }

    // 2. Create domain entity
    const user = User.create(dto.email, dto.name);

    // 3. Persist
    await this.userRepository.save(user);

    // 4. Side effects
    await this.emailPort.send(
      user.email,
      "Welcome",
      "Welcome to our platform!"
    );

    // 5. Return
    return { id: user.id.value, email: user.email.toString() };
  }
}
```

## Anti-Patterns to Avoid

- ❌ Business logic in controllers
- ❌ Direct database calls in use cases
- ❌ Anemic domain models (entities with only getters/setters)
- ❌ God classes (classes that know too much or do too much)
- ❌ Circular dependencies
- ❌ Mocking everything in tests (leads to fragile tests)
- ❌ Tests that test implementation details instead of behavior
- ❌ Skipping tests "because it's simple"

## Resources

- **Clean Code** by Robert C. Martin
- **Domain-Driven Design** by Eric Evans
- **Implementing Domain-Driven Design** by Vaughn Vernon
- **Hexagonal Architecture** by Alistair Cockburn
- **Test-Driven Development** by Kent Beck

## Questions to Ask Yourself

Before committing code:

1. Can I test this easily?
2. If this implementation changes, what else needs to change?
3. Does this class have a single, clear responsibility?
4. Are my dependencies pointing in the right direction?
5. Would a new developer understand this in 6 months?
6. Did I write tests for the happy path and error cases?
7. Is this the simplest solution that could work?

---

_Remember: Good architecture emerges through iterative refinement, not upfront perfection. Start simple, refactor continuously, and let tests guide you._
