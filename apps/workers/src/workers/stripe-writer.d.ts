/**
 * Stripe Writer Worker - Pushes usage deltas to Stripe
 */
export declare class StripeWriterWorker {
    private stripe;
    private intervalId;
    private isRunning;
    private rateLimiter;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private processWriteQueue;
    private processMappingDelta;
    private pushDeltaForCustomer;
}
//# sourceMappingURL=stripe-writer.d.ts.map