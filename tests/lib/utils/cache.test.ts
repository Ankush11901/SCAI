import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  memCache,
  localCache,
  cachedFetch,
  memoize,
  CACHE_TTL,
} from "@/lib/utils/cache";

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Cache Utilities", () => {
  describe("memCache", () => {
    beforeEach(() => {
      memCache.clear();
    });

    it("should store and retrieve values", () => {
      memCache.set("test-key", { name: "test" });
      const value = memCache.get<{ name: string }>("test-key");

      expect(value).toEqual({ name: "test" });
    });

    it("should return null for non-existent keys", () => {
      const value = memCache.get("non-existent");
      expect(value).toBeNull();
    });

    it("should delete values", () => {
      memCache.set("to-delete", "value");
      expect(memCache.get("to-delete")).toBe("value");

      const deleted = memCache.delete("to-delete");
      expect(deleted).toBe(true);
      expect(memCache.get("to-delete")).toBeNull();
    });

    it("should clear all values", () => {
      memCache.set("key1", "value1");
      memCache.set("key2", "value2");

      memCache.clear();

      expect(memCache.get("key1")).toBeNull();
      expect(memCache.get("key2")).toBeNull();
    });

    it("should check if key exists", () => {
      memCache.set("exists", "value");

      expect(memCache.has("exists")).toBe(true);
      expect(memCache.has("not-exists")).toBe(false);
    });

    it("should expire values after TTL", () => {
      vi.useFakeTimers();

      memCache.set("expiring", "value", 1000); // 1 second TTL

      expect(memCache.get("expiring")).toBe("value");

      vi.advanceTimersByTime(1500);

      expect(memCache.get("expiring")).toBeNull();

      vi.useRealTimers();
    });

    it("should return stats", () => {
      memCache.set("key1", "value1");
      memCache.set("key2", "value2");

      const stats = memCache.stats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("valid");
      expect(stats).toHaveProperty("expired");
      expect(stats.total).toBeGreaterThanOrEqual(2);
    });

    it("should handle different data types", () => {
      memCache.set("string", "hello");
      memCache.set("number", 42);
      memCache.set("array", [1, 2, 3]);
      memCache.set("object", { a: 1, b: 2 });
      memCache.set("null", null);

      expect(memCache.get("string")).toBe("hello");
      expect(memCache.get("number")).toBe(42);
      expect(memCache.get("array")).toEqual([1, 2, 3]);
      expect(memCache.get("object")).toEqual({ a: 1, b: 2 });
    });
  });

  describe("localCache", () => {
    beforeEach(() => {
      vi.spyOn(Storage.prototype, "getItem");
      vi.spyOn(Storage.prototype, "setItem");
      vi.spyOn(Storage.prototype, "removeItem");
      localCache.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should generate prefixed keys", () => {
      const key = localCache.getKey("test");
      expect(key).toBe("scai_cache_test");
    });

    it("should handle storage errors gracefully", () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error("Storage error");
      });

      const value = localCache.get("error-key");
      expect(value).toBeNull();
    });

    it("should delete values", () => {
      localCache.delete("to-delete");
      expect(localStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe("CACHE_TTL", () => {
    it("should have correct TTL values", () => {
      expect(CACHE_TTL.SHORT).toBe(30 * 1000);
      expect(CACHE_TTL.MEDIUM).toBe(5 * 60 * 1000);
      expect(CACHE_TTL.LONG).toBe(30 * 60 * 1000);
      expect(CACHE_TTL.HOUR).toBe(60 * 60 * 1000);
      expect(CACHE_TTL.DAY).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("cachedFetch", () => {
    beforeEach(() => {
      memCache.clear();
      vi.mocked(global.fetch).mockReset();
    });

    it("should fetch and cache data", async () => {
      const mockData = { id: 1, name: "Test" };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await cachedFetch<typeof mockData>("/api/test");

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should return cached data on subsequent calls", async () => {
      const mockData = { id: 1, name: "Test" };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      // First call
      await cachedFetch("/api/cached", { cacheType: "memory" });

      // Second call should use cache
      const result = await cachedFetch<typeof mockData>("/api/cached", { cacheType: "memory" });

      expect(result).toEqual(mockData);
      // fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should bypass cache when requested", async () => {
      const mockData = { id: 2, name: "Fresh" };
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      // First call
      await cachedFetch("/api/bypass", { cacheType: "memory" });

      // Second call with bypass
      await cachedFetch("/api/bypass", {
        cacheType: "memory",
        bypassCache: true
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw on failed fetch", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(cachedFetch("/api/error")).rejects.toThrow();
    });
  });

  describe("memoize", () => {
    beforeEach(() => {
      memCache.clear();
    });

    it("should memoize function results", () => {
      const expensiveFn = vi.fn((x: number) => x * 2);
      const memoized = memoize(expensiveFn);

      const result1 = memoized(5);
      const result2 = memoized(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(expensiveFn).toHaveBeenCalledTimes(1);
    });

    it("should call function for different arguments", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);

      memoized(5);
      memoized(10);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should use custom key function", () => {
      const fn = vi.fn((obj: { id: number }) => obj.id * 2);
      const memoized = memoize(fn, {
        keyFn: (obj) => `id-${obj.id}`,
      });

      const result1 = memoized({ id: 5 });
      const result2 = memoized({ id: 5 });

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should expire memoized values", () => {
      vi.useFakeTimers();

      const fn = vi.fn(() => Math.random());
      const memoized = memoize(fn, { ttl: 1000 });

      const result1 = memoized();
      vi.advanceTimersByTime(500);
      const result2 = memoized(); // Still cached

      expect(result1).toBe(result2);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(600); // Past TTL
      memoized(); // New call

      expect(fn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
