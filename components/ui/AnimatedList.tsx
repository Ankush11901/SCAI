"use client";

import * as React from "react";
import { motion, AnimatePresence, type Variants, Reorder } from "motion/react";
import { cn } from "@/lib/utils/cn";

// Stagger animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.15 },
  },
};

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AnimatedList
 * A list with staggered mount animation
 */
function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.ul
      className={cn("space-y-2", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.ul>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AnimatedListItem
 * Individual list item with entrance/exit animations
 */
function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <motion.li className={className} variants={itemVariants} layout>
      {children}
    </motion.li>
  );
}

/**
 * AnimatedListContainer
 * Container that handles AnimatePresence for add/remove animations
 */
interface AnimatedListContainerProps {
  children: React.ReactNode;
  className?: string;
}

function AnimatedListContainer({
  children,
  className,
}: AnimatedListContainerProps) {
  return (
    <motion.ul
      className={cn("space-y-2", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </motion.ul>
  );
}

/**
 * ReorderableList
 * A list that supports drag-to-reorder
 */
interface ReorderableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey: (item: T) => string;
  className?: string;
}

function ReorderableList<T>({
  items,
  onReorder,
  renderItem,
  getKey,
  className,
}: ReorderableListProps<T>) {
  return (
    <Reorder.Group
      axis="y"
      values={items}
      onReorder={onReorder}
      className={cn("space-y-2", className)}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <Reorder.Item
            key={getKey(item)}
            value={item}
            className="cursor-grab active:cursor-grabbing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            whileDrag={{
              scale: 1.02,
              boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.3)",
            }}
          >
            {renderItem(item, index)}
          </Reorder.Item>
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}

export {
  AnimatedList,
  AnimatedListItem,
  AnimatedListContainer,
  ReorderableList,
  containerVariants,
  itemVariants,
};
