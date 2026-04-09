import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  QuotaError,
  RateLimitError,
  GenerationError,
  AIServiceError,
  TimeoutError,
  parseError,
  validateRequired,
  validateTopic,
  validateArticleType,
} from "@/lib/utils/api-errors";

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("API Error Classes", () => {
  describe("AppError", () => {
    it("should create error with message and code", () => {
      const error = new AppError("Test error", "TEST_ERROR");

      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it("should create error with custom status code", () => {
      const error = new AppError("Test error", "TEST_ERROR", 400);

      expect(error.statusCode).toBe(400);
    });

    it("should extend Error", () => {
      const error = new AppError("Test error", "TEST_ERROR");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });

    it("should have proper name", () => {
      const error = new AppError("Test error", "TEST_ERROR");

      expect(error.name).toBe("AppError");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error with field and value", () => {
      const error = new ValidationError("Invalid email", "email", "bad-email");

      expect(error.message).toBe("Invalid email");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe("email");
      expect(error.value).toBe("bad-email");
    });

    it("should extend AppError", () => {
      const error = new ValidationError("Invalid", "field");

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
    });
  });

  describe("AuthenticationError", () => {
    it("should create authentication error", () => {
      const error = new AuthenticationError("Not authenticated");

      expect(error.message).toBe("Not authenticated");
      expect(error.code).toBe("AUTHENTICATION_ERROR");
      expect(error.statusCode).toBe(401);
    });

    it("should use default message", () => {
      const error = new AuthenticationError();

      expect(error.message).toBe("Authentication required");
    });
  });

  describe("QuotaError", () => {
    it("should create quota error with limits", () => {
      const error = new QuotaError(10, 0);

      expect(error.message).toBe("Daily quota exceeded");
      expect(error.code).toBe("QUOTA_EXCEEDED");
      expect(error.statusCode).toBe(429);
      expect(error.limit).toBe(10);
      expect(error.remaining).toBe(0);
    });
  });

  describe("RateLimitError", () => {
    it("should create rate limit error with retry after", () => {
      const error = new RateLimitError(60);

      expect(error.message).toBe("Rate limit exceeded");
      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(60);
    });
  });

  describe("GenerationError", () => {
    it("should create generation error with phase", () => {
      const error = new GenerationError("Failed to generate", "image");

      expect(error.message).toBe("Failed to generate");
      expect(error.code).toBe("GENERATION_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.phase).toBe("image");
    });
  });

  describe("AIServiceError", () => {
    it("should create AI service error with service name", () => {
      const error = new AIServiceError("Service unavailable", "gemini");

      expect(error.message).toBe("Service unavailable");
      expect(error.code).toBe("AI_SERVICE_ERROR");
      expect(error.statusCode).toBe(503);
      expect(error.service).toBe("gemini");
    });
  });

  describe("TimeoutError", () => {
    it("should create timeout error with timeout value", () => {
      const error = new TimeoutError("Request timed out", 30000);

      expect(error.message).toBe("Request timed out");
      expect(error.code).toBe("TIMEOUT_ERROR");
      expect(error.statusCode).toBe(408);
      expect(error.timeout).toBe(30000);
    });
  });
});

describe("Error Parsing", () => {
  describe("parseError", () => {
    it("should return AppError as-is", () => {
      const original = new AppError("Test", "TEST");
      const parsed = parseError(original);

      expect(parsed).toBe(original);
    });

    it("should convert Error to AppError", () => {
      const original = new Error("Standard error");
      const parsed = parseError(original);

      expect(parsed).toBeInstanceOf(AppError);
      expect(parsed.message).toBe("Standard error");
      expect(parsed.code).toBe("UNKNOWN_ERROR");
    });

    it("should handle string errors", () => {
      const parsed = parseError("String error");

      expect(parsed).toBeInstanceOf(AppError);
      expect(parsed.message).toBe("String error");
    });

    it("should handle null/undefined", () => {
      const parsedNull = parseError(null);
      const parsedUndefined = parseError(undefined);

      expect(parsedNull.message).toBe("An unknown error occurred");
      expect(parsedUndefined.message).toBe("An unknown error occurred");
    });

    it("should handle objects with message property", () => {
      const parsed = parseError({ message: "Object error" });

      expect(parsed.message).toBe("Object error");
    });
  });
});

describe("Validation Helpers", () => {
  describe("validateRequired", () => {
    it("should pass for valid values", () => {
      expect(() => validateRequired("value", "field")).not.toThrow();
      expect(() => validateRequired(123, "field")).not.toThrow();
      expect(() => validateRequired({ a: 1 }, "field")).not.toThrow();
    });

    it("should throw ValidationError for empty string", () => {
      expect(() => validateRequired("", "field")).toThrow(ValidationError);
    });

    it("should throw ValidationError for null", () => {
      expect(() => validateRequired(null, "field")).toThrow(ValidationError);
    });

    it("should throw ValidationError for undefined", () => {
      expect(() => validateRequired(undefined, "field")).toThrow(ValidationError);
    });

    it("should include field name in error", () => {
      try {
        validateRequired("", "username");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe("username");
      }
    });
  });

  describe("validateTopic", () => {
    it("should pass for valid topics", () => {
      expect(() => validateTopic("Dog training tips")).not.toThrow();
      expect(() => validateTopic("How to cook pasta")).not.toThrow();
      expect(() => validateTopic("Best budget laptops")).not.toThrow();
    });

    it("should throw for empty topic", () => {
      expect(() => validateTopic("")).toThrow(ValidationError);
    });

    it("should throw for whitespace-only topic", () => {
      expect(() => validateTopic("   ")).toThrow(ValidationError);
    });

    it("should throw for too short topic", () => {
      expect(() => validateTopic("a")).toThrow(ValidationError);
    });

    it("should throw for too long topic", () => {
      const longTopic = "a".repeat(201);
      expect(() => validateTopic(longTopic)).toThrow(ValidationError);
    });

    it("should accept topic at max length", () => {
      const maxTopic = "a".repeat(200);
      expect(() => validateTopic(maxTopic)).not.toThrow();
    });
  });

  describe("validateArticleType", () => {
    it("should pass for valid article types", () => {
      expect(() => validateArticleType("informational")).not.toThrow();
      expect(() => validateArticleType("how-to")).not.toThrow();
      expect(() => validateArticleType("affiliate")).not.toThrow();
      expect(() => validateArticleType("product")).not.toThrow();
    });

    it("should throw for invalid article type", () => {
      expect(() => validateArticleType("invalid-type")).toThrow(ValidationError);
    });

    it("should throw for empty article type", () => {
      expect(() => validateArticleType("")).toThrow(ValidationError);
    });

    it("should be case-sensitive", () => {
      expect(() => validateArticleType("INFORMATIONAL")).toThrow(ValidationError);
      expect(() => validateArticleType("Informational")).toThrow(ValidationError);
    });
  });
});
