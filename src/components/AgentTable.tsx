import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AgentConfig } from "@/types/agent";

interface AgentTableProps {
  agents: AgentConfig[];
  onSelect: (id: string) => void;
}

export default function AgentTable({ agents, onSelect }: AgentTableProps) {
  const sorted = useMemo(() => {
    return [...agents].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
  }, [agents]);

  return (
    <Card>
      <div className="p-4">
        <h3 className="text-lg font-semibold">Agent List</h3>
      </div>
      <div className="px-4 pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a) => (
              <TableRow key={a.id} className="hover:bg-accent/40 cursor-pointer" onClick={() => onSelect(a.id)}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>{a.id}</TableCell>
                <TableCell>{new Date(a.lastModified).toLocaleString()}</TableCell>
                <TableCell>{a.status}</TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">No agents yet. Save or deploy to see them here.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
