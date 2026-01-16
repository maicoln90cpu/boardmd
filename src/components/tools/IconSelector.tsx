import { useState } from "react";
import { 
  Wrench, Globe, Code, Database, Video, Image, Music, 
  FileText, Bot, Brain, Sparkles, Zap, Cloud, Lock, 
  CreditCard, Mail, MessageSquare, Send, Share2, Link,
  Laptop, Smartphone, Monitor, Server, Cpu, HardDrive,
  Palette, PenTool, Brush, Scissors, Camera, Mic,
  Play, Headphones, Radio, Tv, Film, Youtube,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface IconOption {
  name: string;
  icon: LucideIcon;
}

const iconOptions: IconOption[] = [
  { name: "wrench", icon: Wrench },
  { name: "globe", icon: Globe },
  { name: "code", icon: Code },
  { name: "database", icon: Database },
  { name: "video", icon: Video },
  { name: "image", icon: Image },
  { name: "music", icon: Music },
  { name: "filetext", icon: FileText },
  { name: "bot", icon: Bot },
  { name: "brain", icon: Brain },
  { name: "sparkles", icon: Sparkles },
  { name: "zap", icon: Zap },
  { name: "cloud", icon: Cloud },
  { name: "lock", icon: Lock },
  { name: "creditcard", icon: CreditCard },
  { name: "mail", icon: Mail },
  { name: "messagesquare", icon: MessageSquare },
  { name: "send", icon: Send },
  { name: "share2", icon: Share2 },
  { name: "link", icon: Link },
  { name: "laptop", icon: Laptop },
  { name: "smartphone", icon: Smartphone },
  { name: "monitor", icon: Monitor },
  { name: "server", icon: Server },
  { name: "cpu", icon: Cpu },
  { name: "harddrive", icon: HardDrive },
  { name: "palette", icon: Palette },
  { name: "pentool", icon: PenTool },
  { name: "brush", icon: Brush },
  { name: "scissors", icon: Scissors },
  { name: "camera", icon: Camera },
  { name: "mic", icon: Mic },
  { name: "play", icon: Play },
  { name: "headphones", icon: Headphones },
  { name: "radio", icon: Radio },
  { name: "tv", icon: Tv },
  { name: "film", icon: Film },
  { name: "youtube", icon: Youtube },
];

export const iconMap: Record<string, LucideIcon> = iconOptions.reduce(
  (acc, opt) => ({ ...acc, [opt.name]: opt.icon }),
  {}
);

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function IconSelector({ value, onChange }: IconSelectorProps) {
  const [open, setOpen] = useState(false);
  
  const SelectedIcon = iconMap[value] || Wrench;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3"
          type="button"
        >
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <SelectedIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-muted-foreground">Clique para trocar o ícone</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="grid grid-cols-6 gap-2">
          {iconOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.name}
                variant="ghost"
                size="icon"
                type="button"
                className={cn(
                  "h-10 w-10",
                  value === option.name && "bg-primary/10 ring-1 ring-primary"
                )}
                onClick={() => {
                  onChange(option.name);
                  setOpen(false);
                }}
              >
                <Icon className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
