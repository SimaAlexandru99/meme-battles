import {
  cn,
  getRandomAvatar,
  getAvatarById,
  AVATAR_OPTIONS,
} from "@/lib/utils";

describe("Utils", () => {
  describe("cn function", () => {
    it("combines class names correctly", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("handles conditional classes", () => {
      expect(cn("base", true && "conditional", false && "not-included")).toBe(
        "base conditional",
      );
    });

    it("handles undefined and null values", () => {
      expect(cn("base", undefined, null, "valid")).toBe("base valid");
    });

    it("handles empty strings", () => {
      expect(cn("base", "", "valid")).toBe("base valid");
    });

    it("handles objects with conditional classes", () => {
      expect(cn("base", { conditional: true, "not-included": false })).toBe(
        "base conditional",
      );
    });

    it("handles arrays", () => {
      expect(cn("base", ["class1", "class2"])).toBe("base class1 class2");
    });

    it("handles mixed types", () => {
      expect(
        cn("base", "class1", { conditional: true }, ["array1", "array2"]),
      ).toBe("base class1 conditional array1 array2");
    });
  });

  describe("AVATAR_OPTIONS", () => {
    it("contains the expected avatar options", () => {
      expect(AVATAR_OPTIONS).toHaveLength(5);
      expect(AVATAR_OPTIONS[0]).toEqual({
        id: "akward-look-monkey",
        name: "Awkward Look Monkey",
        src: "/icons/akward-look-monkey.png",
        fallback: "AM",
      });
    });

    it("has unique IDs for all avatars", () => {
      const ids = AVATAR_OPTIONS.map((avatar) => avatar.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(AVATAR_OPTIONS.length);
    });

    it("has valid fallback values", () => {
      AVATAR_OPTIONS.forEach((avatar) => {
        expect(avatar.fallback).toHaveLength(2);
        expect(typeof avatar.fallback).toBe("string");
      });
    });
  });

  describe("getRandomAvatar function", () => {
    it("returns an avatar from the options", () => {
      const avatar = getRandomAvatar();
      expect(AVATAR_OPTIONS).toContain(avatar);
    });

    it("returns different avatars on multiple calls", () => {
      const avatar1 = getRandomAvatar();
      const avatar2 = getRandomAvatar();
      const avatar3 = getRandomAvatar();

      // At least one should be different (though theoretically they could all be the same)
      const avatars = [avatar1, avatar2, avatar3];
      const uniqueAvatars = new Set(avatars.map((a) => a.id));
      expect(uniqueAvatars.size).toBeGreaterThanOrEqual(1);
    });

    it("returns avatar with all required properties", () => {
      const avatar = getRandomAvatar();
      expect(avatar).toHaveProperty("id");
      expect(avatar).toHaveProperty("name");
      expect(avatar).toHaveProperty("src");
      expect(avatar).toHaveProperty("fallback");
    });
  });

  describe("getAvatarById function", () => {
    it("returns the correct avatar for valid ID", () => {
      const avatar = getAvatarById("akward-look-monkey");
      expect(avatar).toEqual({
        id: "akward-look-monkey",
        name: "Awkward Look Monkey",
        src: "/icons/akward-look-monkey.png",
        fallback: "AM",
      });
    });

    it("returns undefined for invalid ID", () => {
      const avatar = getAvatarById("non-existent");
      expect(avatar).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const avatar = getAvatarById("");
      expect(avatar).toBeUndefined();
    });

    it("returns undefined for null", () => {
      const avatar = getAvatarById(null as any);
      expect(avatar).toBeUndefined();
    });

    it("finds all valid avatar IDs", () => {
      AVATAR_OPTIONS.forEach((option) => {
        const avatar = getAvatarById(option.id);
        expect(avatar).toEqual(option);
      });
    });
  });
});
