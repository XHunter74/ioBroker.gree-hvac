// This file extends the AdapterConfig type from "@types/iobroker"
// to provide typings for adapter.config properties

declare global {
    namespace ioBroker {
        interface AdapterConfig {
            devicelist: Array<{ deviceIp: string }>;
            pollInterval: number;
            requestTimeoutMs: number;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
