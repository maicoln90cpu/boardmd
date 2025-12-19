"use client";

import { cn } from "@/lib/utils";
import { Link, LinkProps } from "react-router-dom";
import React, { useState, createContext, useContext, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
  onClick?: () => void;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  isPinned: boolean;
  setIsPinned: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  isPinned: isPinnedProp,
  setIsPinned: setIsPinnedProp,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  isPinned?: boolean;
  setIsPinned?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [openState, setOpenState] = useState(false);
  const [pinnedState, setPinnedState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  const isPinned = isPinnedProp !== undefined ? isPinnedProp : pinnedState;
  const setIsPinned = setIsPinnedProp !== undefined ? setIsPinnedProp : setPinnedState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, isPinned, setIsPinned }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  isPinned,
  setIsPinned,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
  isPinned?: boolean;
  setIsPinned?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  // Create a dummy setIsPinned if not provided (controlled from Config now)
  const dummySetIsPinned = React.useCallback(() => {}, []);
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate} isPinned={isPinned} setIsPinned={setIsPinned || dummySetIsPinned}>
      {children}
    </SidebarProvider>
  );
};

interface SidebarBodyProps {
  className?: string;
  children: React.ReactNode;
}

export const SidebarBody = ({ className, children }: SidebarBodyProps) => {
  return (
    <DesktopSidebar className={className}>{children}</DesktopSidebar>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, isPinned } = useSidebar();
  
  return (
    <motion.div
      className={cn(
        "h-full px-4 py-4 hidden md:flex md:flex-col bg-card border-r border-border flex-shrink-0",
        className
      )}
      animate={{
        width: animate ? (isPinned || open ? "220px" : "68px") : "220px",
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      onMouseEnter={() => !isPinned && setOpen(true)}
      onMouseLeave={() => !isPinned && setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

// Pin button component for sidebar
export const SidebarPinButton = () => {
  const { isPinned, setIsPinned, open, setOpen } = useSidebar();
  
  const handleTogglePin = () => {
    if (isPinned) {
      // Desafixar: mantém o estado atual (expandido ou colapsado)
      setIsPinned(false);
    } else {
      // Fixar: fixa no estado atual (se está aberto, fixa aberto; se fechado, fixa fechado)
      setIsPinned(true);
    }
  };
  
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isPinned ? "secondary" : "ghost"}
            size="icon"
            onClick={handleTogglePin}
            className={cn(
              "h-8 w-8 transition-all flex-shrink-0",
              isPinned && "bg-primary/10 text-primary border border-primary/30"
            )}
          >
            {isPinned ? (
              <Pin className="h-4 w-4" />
            ) : (
              <PinOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{isPinned ? "Desafixar menu" : "Fixar menu"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-card border-b border-border w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <Menu
            className="text-foreground cursor-pointer h-6 w-6"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-card p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-6 top-6 z-50 text-foreground cursor-pointer"
                onClick={() => setOpen(false)}
              >
                <X className="h-6 w-6" />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  ...props
}: {
  link: Links;
  className?: string;
  active?: boolean;
  props?: Omit<LinkProps, "to">;
}) => {
  const { open, animate } = useSidebar();
  
  const handleClick = (e: React.MouseEvent) => {
    if (link.onClick) {
      e.preventDefault();
      link.onClick();
    }
  };

  return (
    <Link
      to={link.href}
      onClick={handleClick}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-lg transition-colors duration-200",
        active 
          ? "bg-primary/10 text-primary" 
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className
      )}
      {...props}
    >
      <span className="flex-shrink-0">{link.icon}</span>
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        transition={{
          duration: 0.2,
          ease: "easeInOut",
        }}
        className={cn(
          "text-sm font-medium group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0",
          active && "font-semibold"
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};

export const SidebarDivider = () => {
  const { open, animate } = useSidebar();
  return (
    <motion.div
      animate={{
        width: animate ? (open ? "100%" : "32px") : "100%",
      }}
      className="h-px bg-border my-3 mx-auto"
    />
  );
};
