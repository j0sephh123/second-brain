"use client";

import { useState, useEffect, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export default function VisualizationArea() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetchAndVisualizeNotes();
  }, []);

  const fetchAndVisualizeNotes = async () => {
    try {
      const response = await fetch("/api/notes");
      const fileTree: FileNode[] = await response.json();
      const { nodes: newNodes, edges: newEdges } = createFlowElements(fileTree);
      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error("Error fetching notes for visualization:", error);
    }
  };

  const createFlowElements = (
    fileTree: FileNode[],
    parentId: string | null = null,
    xOffset: number = 0,
    yOffset: number = 0
  ): { nodes: Node[]; edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let currentY = yOffset;

    fileTree.forEach((node) => {
      const nodeId = node.path;
      const nodeType = node.type === "directory" ? "folder" : "file";

      nodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: xOffset, y: currentY },
        data: { label: node.name },
      });

      if (parentId) {
        edges.push({
          id: `${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
        });
      }

      if (node.children) {
        const { nodes: childNodes, edges: childEdges } = createFlowElements(
          node.children,
          nodeId,
          xOffset + 250,
          currentY
        );
        nodes.push(...childNodes);
        edges.push(...childEdges);
        currentY += 100 * node.children.length;
      } else {
        currentY += 100;
      }
    });

    return { nodes, edges };
  };

  return (
    <div className="h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Knowledge Graph</h2>
      </div>
      <div className="h-[calc(100%-4rem)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
