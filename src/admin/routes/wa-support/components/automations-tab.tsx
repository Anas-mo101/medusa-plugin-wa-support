import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Container, Heading, Table, FocusModal, Input, IconButton, DropdownMenu
} from "@medusajs/ui";
import { Plus, EllipsisHorizontal, PencilSquare, Trash } from "@medusajs/icons";
import { sdk } from "../../../lib/sdk";

import ReactFlow, {
  Controls, Background, useNodesState, useEdgesState, addEdge,
  ReactFlowProvider, Handle, Position
} from "reactflow";
import "reactflow/dist/style.css";

interface Automation {
  id: string;
  name: string;
  flow: {
    nodes: []
    edges: []
  };
}

// ==========================================
// 1. CUSTOM REACT FLOW NODES
// ==========================================

const RespondNode = ({ data }: any) => {
  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 w-64 shadow-elevation-card-rest">
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2" />
      <div className="text-small font-semibold text-ui-text-base mb-2 flex items-center gap-x-2">
        <div className="w-2 h-2 rounded-full bg-ui-fg-interactive" />
        Respond Node
      </div>
      <textarea
        className="w-full text-small bg-ui-bg-subtle border border-ui-border-base rounded-md p-2 outline-none focus:border-ui-border-interactive"
        defaultValue={data.question}
        onChange={(e) => { data.question = e.target.value }}
        placeholder="Enter response flow..."
        rows={3}
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2" />
    </div>
  );
};

const McqNode = ({ data }: any) => {
  // Ensure array structure exists to prevent crashes
  const [options, setOptions] = useState<string[]>(data.handleValues || ["Option 1", "Option 2"]);

  const updateOption = (index: number, val: string) => {
    const newOpts = [...options];
    newOpts[index] = val;
    setOptions(newOpts);
    data.handleValues = newOpts;
  };

  const addOption = () => {
    if (options.length >= 5) return; // Cap at 5 for WhatsApp Poll limits
    const newOpts = [...options, `Option ${options.length + 1}`];
    setOptions(newOpts);
    data.handleValues = newOpts;
  };

  const removeOption = () => {
    if (options.length <= 1) return;
    const newOpts = options.slice(0, -1);
    setOptions(newOpts);
    data.handleValues = newOpts;
  };

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 w-72 shadow-elevation-card-rest">
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2" />
      <div className="flex justify-between items-center mb-3">
        <div className="text-small font-semibold text-ui-text-base flex items-center gap-x-2">
          <div className="w-2 h-2 rounded-full bg-ui-tag-blue-icon" />
          Poll / MCQ Node
        </div>
        <div className="flex gap-x-1">
          <button type="button" onClick={removeOption} className="w-6 h-6 rounded-md bg-ui-bg-subtle hover:bg-ui-bg-base-hover border border-ui-border-base text-ui-text-subtle text-small flex items-center justify-center">-</button>
          <button type="button" onClick={addOption} className="w-6 h-6 rounded-md bg-ui-bg-subtle hover:bg-ui-bg-base-hover border border-ui-border-base text-ui-text-subtle text-small flex items-center justify-center">+</button>
        </div>
      </div>

      <Input
        size="small"
        className="mb-3"
        defaultValue={data.question}
        onChange={(e) => { data.question = e.target.value }}
        placeholder="Poll Question..."
      />

      <div className="space-y-2 relative">
        {options.map((opt, i) => (
          <div key={`opt-${i}`} className="flex items-center gap-x-2">
            <span className="text-xsmall text-ui-text-subtle w-4">{i + 1}.</span>
            <Input
              size="small"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
            />
          </div>
        ))}

        {/* Dynamic Handles distributed across the bottom */}
        {options.map((v, i) => (
          <Handle
            key={`handle-${v.toLowerCase().replace(" ", "_")}`}
            type="source"
            position={Position.Bottom}
            id={`handle-${v.toLowerCase().replace(" ", "_")}`}
            style={{ left: `${(100 / (options.length + 1)) * (i + 1)}%` }}
            className="w-3 h-3 border-2"
          />
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  respondNode: RespondNode,
  mcqNode: McqNode
};

// ==========================================
// 2. MAIN AUTOMATIONS TAB
// ==========================================

export const AutomationsTab = () => {
  const queryClient = useQueryClient();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeAutomation, setActiveAutomation] = useState<Automation | null>(null);

  // --- QUERIES & MUTATIONS ---
  const { data, isLoading } = useQuery<{ automations: Automation[] }>({
    queryKey: ["admin", "whatsapp-automations"],
    queryFn: () => sdk.client.fetch("/admin/whatsapp/acts", { method: "GET" }),
  });

  const { mutate: deleteAutomation } = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/whatsapp/acts/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-automations"] }),
  });

  const openEditor = (automation: Automation | null = null) => {
    setActiveAutomation(automation);
    setIsEditorOpen(true);
  };

  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-ui-border-base">
        <div>
          <Heading level="h2">Flow Automations</Heading>
          <p className="text-ui-text-subtle text-xs mt-1">
            Build interactive dialogue trees to automate customer support responses.
          </p>
        </div>
        <Button size="small" variant="secondary" onClick={() => openEditor(null)}>
          <Plus /> Create Flow
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Flow Name </Table.HeaderCell>
            <Table.HeaderCell>Nodes Count</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {
            isLoading ? (
              <Table.Row><Table.Cell className="text-center py-8">Loading...</Table.Cell></Table.Row>
            ) : data?.automations?.length === 0 ? (
              <Table.Row>
                <Table.Cell className="font-medium"></Table.Cell>
                <Table.Cell className="text-ui-text-subtle"> No automation yet </Table.Cell>
                <Table.Cell className="text-right">
                </Table.Cell>
              </Table.Row>
            ) : (
              data?.automations?.map((act) => {
                let nodeCount = 0;
                try { nodeCount = act.flow?.nodes?.length || 0; } catch (e) { }
                return (
                  <Table.Row key={act.id}>
                    <Table.Cell className="font-medium">{act.name}</Table.Cell>
                    <Table.Cell className="text-ui-text-subtle">{nodeCount} Nodes</Table.Cell>
                    <Table.Cell className="text-right">
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild><IconButton variant="transparent"><EllipsisHorizontal /></IconButton></DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                          <DropdownMenu.Item onClick={() => openEditor(act)} className="gap-x-2"><PencilSquare /> Edit Flow</DropdownMenu.Item>
                          <DropdownMenu.Separator />
                          <DropdownMenu.Item onClick={() => { if (confirm("Delete this flow?")) deleteAutomation(act.id) }} className="gap-x-2 text-ui-fg-error"><Trash /> Delete</DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                )
              })
            )
          }
        </Table.Body>
      </Table>

      {/* NODE EDITOR MODAL */}
      <FocusModal open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <FocusModal.Content>
          <ReactFlowProvider>
            <FlowEditorWorkspace
              initialData={activeAutomation}
              onClose={() => setIsEditorOpen(false)}
            />
          </ReactFlowProvider>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
};


// ==========================================
// 3. WORKSPACE EDITOR COMPONENT
// ==========================================

const FlowEditorWorkspace = ({ initialData, onClose }: { initialData: Automation | null, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [rfInstance, setRfInstance] = useState<any>(null);
  const [nameName, setNameName] = useState(initialData?.name || "");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load existing data
  useEffect(() => {
    if (initialData?.flow) {
      try {
        const flow = initialData.flow;
        if (flow.nodes) setNodes(flow.nodes);
        if (flow.edges) setEdges(flow.edges);
      } catch (e) { console.error("Failed parsing flow"); }
    } else {
      // Default Start Node
      setNodes([{ id: "start_node_1", type: "input", data: { label: "Incoming Flow" }, position: { x: 250, y: 50 } }]);
    }
  }, [initialData, setNodes, setEdges]);

  // Mutations
  const { mutate: saveFlow, isPending: isSaving } = useMutation({
    mutationFn: (payload: { name: string; flow: string }) => {
      if (initialData?.id) {
        return sdk.client.fetch(`/admin/whatsapp/acts/${initialData.id}`, { method: "POST", body: payload });
      }
      return sdk.client.fetch("/admin/whatsapp/acts", { method: "POST", body: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "whatsapp-automations"] });
      onClose();
    }
  });

  const handleSave = () => {
    if (!rfInstance) return;
    const flowObj = rfInstance.toObject();
    delete flowObj.viewport; // strip viewport so it always centers on load
    saveFlow({ name: nameName || "Unnamed Flow", flow: flowObj });
  };

  // Drag & Drop logic
  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const onDragOver = useCallback((event: any) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((event: any) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !rfInstance) return;

    const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({
      x: event.clientX - (reactFlowBounds?.left || 0),
      y: event.clientY - (reactFlowBounds?.top || 0),
    });

    const newNode = {
      id: `node_${Date.now()}`,
      type,
      position,
      data: { question: "", handleValues: type === "mcqNode" ? ["Option 1", "Option 2"] : [] },
    };

    setNodes((nds) => nds.concat(newNode));
  }, [rfInstance, setNodes]);

  return (
    <div className="flex flex-col h-screen w-full bg-ui-bg-subtle">
      {/* Header */}
      <FocusModal.Header>
        <div className="flex items-center justify-between w-full px-4">
          <div className="flex items-center gap-x-4">
            <span className="text-small font-medium text-ui-text-subtle">Flow Name:</span>
            <Input
              size="small"
              placeholder="e.g., Welcome Routing"
              value={nameName}
              onChange={(e) => setNameName(e.target.value)}
            />
          </div>
          <Button size="small" variant="primary" onClick={handleSave} isLoading={isSaving}>
            {initialData ? "Update Flow" : "Save Flow"}
          </Button>
        </div>
      </FocusModal.Header>

      <FocusModal.Body className="flex-1 flex overflow-hidden">
        {/* Sidebar Toolbox */}
        <aside className="w-64 bg-ui-bg-base border-r border-ui-border-base p-4 flex flex-col gap-y-4">
          <Heading level="h3" className="text-small text-ui-text-subtle uppercase tracking-wider mb-2">Node Toolbox</Heading>

          <div
            className="p-3 bg-ui-bg-subtle border border-ui-border-base rounded-md cursor-grab active:cursor-grabbing text-small font-medium flex items-center gap-x-2 shadow-sm"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'respondNode')}
            draggable
          >
            <div className="w-2 h-2 rounded-full bg-ui-fg-interactive" /> Respond Node
          </div>

          <div
            className="p-3 bg-ui-bg-subtle border border-ui-border-base rounded-md cursor-grab active:cursor-grabbing text-small font-medium flex items-center gap-x-2 shadow-sm"
            onDragStart={(e) => e.dataTransfer.setData('application/reactflow', 'mcqNode')}
            draggable
          >
            <div className="w-2 h-2 rounded-full bg-ui-tag-blue-icon" /> MCQ / Poll Node
          </div>

          <p className="text-xsmall text-ui-text-subtle mt-4 text-balance">
            Drag and drop nodes onto the canvas to build your automated dialogue flow.
          </p>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#ccc" gap={16} />
            <Controls />
          </ReactFlow>
        </main>
      </FocusModal.Body>
    </div>
  );
};