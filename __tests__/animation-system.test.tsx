import React from "react";
import { render, screen } from "@testing-library/react";
import { motion } from "framer-motion";
import {
  cardExitVariants,
  buttonVariants,
  microInteractionVariants,
} from "@/lib/animations/private-lobby-variants";

// Mock Framer Motion for testing
jest.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      variants?: Record<string, unknown>;
      custom?: number;
      [key: string]: unknown;
    }) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
    button: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      variants?: Record<string, unknown>;
      [key: string]: unknown;
    }) => (
      <button data-testid="motion-button" {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="animate-presence">{children}</div>
  ),
}));

describe("Animation System", () => {
  describe("Animation Variants", () => {
    test("cardExitVariants should have correct structure", () => {
      expect(cardExitVariants).toHaveProperty("initial");
      expect(cardExitVariants).toHaveProperty("exit");
      expect(typeof cardExitVariants.exit).toBe("function");
    });

    test("buttonVariants should have correct structure", () => {
      expect(buttonVariants).toHaveProperty("initial");
      expect(buttonVariants).toHaveProperty("hover");
      expect(buttonVariants).toHaveProperty("tap");
    });

    test("microInteractionVariants should have correct structure", () => {
      expect(microInteractionVariants).toHaveProperty("initial");
      expect(microInteractionVariants).toHaveProperty("hover");
      expect(microInteractionVariants).toHaveProperty("tap");
    });
  });

  describe("Motion Components", () => {
    test("motion.div should render with variants", () => {
      render(
        <motion.div variants={cardExitVariants} custom={0}>
          Test Content
        </motion.div>
      );

      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toBeInTheDocument();
      expect(motionDiv).toHaveTextContent("Test Content");
    });

    test("motion.button should render with button variants", () => {
      render(
        <motion.button variants={buttonVariants}>Test Button</motion.button>
      );

      const motionButton = screen.getByTestId("motion-button");
      expect(motionButton).toBeInTheDocument();
      expect(motionButton).toHaveTextContent("Test Button");
    });
  });

  describe("Animation Variants Functionality", () => {
    test("cardExitVariants should have correct structure", () => {
      expect(cardExitVariants).toHaveProperty("initial");
      expect(cardExitVariants).toHaveProperty("exit");
      expect(typeof cardExitVariants.exit).toBe("function");
    });

    test("buttonVariants should have correct hover animation", () => {
      expect(buttonVariants.hover).toHaveProperty("scale", 1.05);
      expect(buttonVariants.hover).toHaveProperty("transition");
    });

    test("buttonVariants should have correct tap animation", () => {
      expect(buttonVariants.tap).toHaveProperty("scale", 0.95);
      expect(buttonVariants.tap).toHaveProperty("transition");
    });

    test("microInteractionVariants should have correct structure", () => {
      expect(microInteractionVariants).toHaveProperty("initial");
      expect(microInteractionVariants).toHaveProperty("hover");
      expect(microInteractionVariants).toHaveProperty("tap");
    });
  });
});
