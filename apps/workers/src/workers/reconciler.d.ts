/**
 * Reconciler Worker - Compares local usage with Stripe and identifies discrepancies
 */
export declare class ReconcilerWorker {
    private stripe;
    private intervalId;
    private isRunning;
    constructor();
    start(): Promise<void>;
    stop(): Promise<void>;
    private runReconciliation;
    private reconcileSubscriptionItem;
    private getStripeUsage;
    private createSuggestedAdjustments;
}
//# sourceMappingURL=reconciler.d.ts.map