/**
 * Alert Monitor Worker - Monitors usage and triggers alerts
 */
export declare class AlertMonitorWorker {
    private intervalId;
    private isRunning;
    start(): Promise<void>;
    stop(): Promise<void>;
    private checkAlerts;
    private checkAlertConfig;
    private triggerAlert;
    private getPreviousPeriodValue;
    private sendEmailAlert;
    private sendWebhookAlert;
    private sendSlackAlert;
    private enforceHardCap;
    private enforceSoftCap;
}
//# sourceMappingURL=alert-monitor.d.ts.map