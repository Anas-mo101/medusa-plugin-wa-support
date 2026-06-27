export interface AutomationNode {
    id: string;
    type: string;
    data: any;
}

interface AutomationEdge {
    id: string;
    source?: string;
    sourceHandle?: string
    target?: string
    targetHandle?: string
}

export interface AutomationFlow {
    nodes: Array<AutomationNode>;
    edges: Array<AutomationEdge>;
}

interface AutomationConcernTopic {
    id: string,
    flow: AutomationFlow,
    isDone: boolean,
    lastNodeId?: string | null
}

type GetACT = (ticketId: string) => Promise<AutomationConcernTopic>;
type UpdateACTLastNode = (id: string, nodeId: string) => void;
type updateACTisDone = (id: string, isDone: boolean) => void;

type NodeFunction = (node: AutomationNode, currentTicketId: string) => void;

export interface NodeFunctionality {
    type: string;
    process: NodeFunction;
}

interface AutomationConstructor {
    getACT: GetACT;
    updateLastNode: UpdateACTLastNode;
    toggleACTIsDone: updateACTisDone;
    nodeFunctions: NodeFunctionality[];
}

export class Automation {
    private getACT: GetACT;
    private updateLastNode: UpdateACTLastNode;
    private toggleACTIsDone: updateACTisDone;
    private nodeFunctions: NodeFunctionality[];

    private constructor({
        getACT,
        updateLastNode,
        toggleACTIsDone,
        nodeFunctions
    }: AutomationConstructor) {
        this.getACT = getACT;
        this.updateLastNode = updateLastNode;
        this.toggleACTIsDone = toggleACTIsDone;
        this.nodeFunctions = nodeFunctions;
    }

    static create(props = {} as AutomationConstructor): Automation {
        return new Automation(props || {}) as Automation
    }

    async trigger(input: string, ticketId: string): Promise<AutomationNode | undefined> {
        const act: AutomationConcernTopic = await this.getACT(ticketId);
        const node: AutomationNode | undefined = await this.proccessAutomationFlow(input, act, ticketId);
        return node;
    }

    private async proccessAutomationFlow(input: string, act: AutomationConcernTopic, ticketId: string): Promise<AutomationNode | undefined> {
        const nodes: AutomationNode[] = act.flow.nodes as Array<AutomationNode>;
        const edges: AutomationEdge[] = act.flow.edges as Array<AutomationEdge>;
        const lastNodeId: string | undefined | null = act.lastNodeId;

        if (!lastNodeId) {

            // check for starting node
            const startNode: AutomationNode | undefined = nodes.find((e) => e.type === 'input');
            if (!startNode) {
                this.toggleACTIsDone(ticketId, true);
                return;
            }

            // find connecting edge
            const startNodeId = startNode.id;
            const connectingEdges: AutomationEdge | undefined = edges.find((e) => e.source === startNodeId);
            if (!connectingEdges) {
                this.toggleACTIsDone(ticketId, true);
                return;
            }

            // find other node connected to edge
            const nextNode: AutomationNode | undefined = nodes.find((e) => e.id === connectingEdges.target);
            if (!nextNode) {
                this.toggleACTIsDone(ticketId, true);
                return;
            }

            this.updateLastNode(ticketId, nextNode.id);

            await this.executeNode(nextNode, ticketId);

            return nextNode;
        }

        /// if prev node is mcq then determine what is the next node based on input
        const checkLastNode = nodes.find((e) => e.id === lastNodeId);
        if (checkLastNode && checkLastNode.type === "mcqNode") {

            const nextNode = await this.handleMultiEdges(input, edges, nodes, checkLastNode, ticketId);

            if (!nextNode) {
                this.toggleACTIsDone(ticketId, true);
                return;
            }

            await this.executeNode(nextNode, ticketId);

            this.updateLastNode(ticketId, nextNode.id);

            return nextNode;
        }

        const connectingEdge = edges.find((e) => e.source === lastNodeId);
        if (!connectingEdge) {
            this.toggleACTIsDone(ticketId, true);
            return;
        }

        const nextNode = nodes.find((e) => e.id === connectingEdge.target);
        if (!nextNode) {
            this.toggleACTIsDone(ticketId, true);
            return;
        }

        await this.executeNode(nextNode, ticketId);

        this.updateLastNode(ticketId, nextNode.id);

        return nextNode;
    }

    // finds and return the next node from multple valid option based on input, and will execute prev node if none were found
    private async handleMultiEdges(
        input: string,
        edges: AutomationEdge[],
        nodes: AutomationNode[],
        lastNode: AutomationNode,
        currentTicketId: string
    ): Promise<AutomationNode | undefined> {
        const connectingEdges = edges.filter((e) => e.source === lastNode.id);
        const choice = input.toLowerCase().replaceAll(" ", "_");

        const connectingEdge = connectingEdges.find((e) => e.sourceHandle === `handle-${choice}`);

        if (!connectingEdge) {
            await this.executeNode(lastNode, currentTicketId);
            return;
        }

        const nextNode = nodes.find((e) => e.id === connectingEdge.target);

        return nextNode;
    }

    private executeNode(node: AutomationNode, ticketId: string): void {
        const nodeFunction = this.nodeFunctions.find((e) => e.type === node.type);
        if (nodeFunction) {
            nodeFunction.process(node, ticketId);
        }
    }
}