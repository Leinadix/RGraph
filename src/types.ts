export interface Node {
  id: string;
  label: string;
  description: string;
  icon?: string;
  x: number;
  y: number;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
} 