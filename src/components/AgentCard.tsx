import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type LucideIcon } from "lucide-react";

interface AgentCardProps {
  name: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
  Icon: LucideIcon;
}

const AgentCard = ({ name, description, selected, onClick, Icon }: AgentCardProps) => {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={cn(
        "min-w-[280px] max-w-sm cursor-pointer select-none rounded-lg border transition-colors",
        "bg-card hover:bg-accent/30",
        selected ? "ring-2 ring-primary border-primary" : "border-border"
      )}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={cn("p-2 rounded-md bg-primary/10 text-primary")}> 
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold leading-tight">{name}</h3>
            {selected && <Badge variant="secondary">Selected</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Card>
  );
};

export default AgentCard;
