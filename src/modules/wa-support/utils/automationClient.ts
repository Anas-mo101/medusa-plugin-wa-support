import { AutomationNode,  Automation, } from "./automation";

const automation = Automation.create({
    getACT: async (id: string) => {

        return {
            id: "1",
            isDone: false,
            lastNodeId: "3",
            flow: {
                edges: [],
                nodes: []
            }
        };
    },
    updateLastNode: async (id: string, nodeId: string) => {

    },
    toggleACTIsDone: async (id: string, isDone: boolean) => {

    },
    nodeFunctions: [
        {
            type: "mcqNode",
            process: (node) => async (node: AutomationNode) => {

            }
        },
        {
            type: "respondNode",
            process: (node) => async (node: AutomationNode) => {

            }
        },
        {
            type: "textUpdater",
            process: (node) => async (node: AutomationNode) => {

            }
        },
    ]
});

export default automation;