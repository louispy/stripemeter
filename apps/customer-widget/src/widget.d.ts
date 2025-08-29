interface WidgetProps {
    apiUrl: string;
    tenantId: string;
    customerId: string;
    apiKey?: string;
    theme?: 'light' | 'dark';
    compact?: boolean;
}
declare function UsageWidget({ tenantId, customerId, theme, compact }: WidgetProps): import("react").JSX.Element;
export declare function initStripemeterWidget(containerId: string, props: WidgetProps): import("react-dom/client").Root | undefined;
export default UsageWidget;
//# sourceMappingURL=widget.d.ts.map