/**
 * Aggregator Worker - Processes events and updates counters
 */
export declare class AggregatorWorker {
    private worker;
    private queue;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private processAggregation;
}
//# sourceMappingURL=aggregator.d.ts.map