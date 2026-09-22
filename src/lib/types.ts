export type Role = 'admin' | 'operations' | 'sales' | 'viewer';
export type Kind = 'screens' | 'clients' | 'operators' | 'campaigns' | 'evidence' | 'incidents' | 'opportunities' | 'quotes';
export interface Base { id: string; version: number; createdAt: string; updatedAt: string }
export interface Screen extends Base { name: string; city: string; province: string; address: string; latitude: number; longitude: number; ownership: 'own' | 'partner'; environment: 'outdoor' | 'indoor'; status: 'online' | 'offline' | 'maintenance' | 'unknown'; operatorId: string; width: number; height: number; resolution: string; slotSeconds: number; loopSeconds: number; operatingHours: number; monthlyRate: number; monthlyCost: number; currency: 'ARS' | 'USD'; lastSeen: string; notes: string; externalId: string }
export interface Client extends Base { name: string; company: string; email: string; phone: string; type: 'agency' | 'direct'; notes: string }
export interface Operator extends Base { name: string; city: string; contact: string; email: string; phone: string; status: 'prospect' | 'contacted' | 'negotiating' | 'active'; notes: string }
export interface Campaign extends Base { name: string; clientId: string; screenIds: string[]; startDate: string; endDate: string; status: 'draft' | 'scheduled' | 'active' | 'completed' | 'paused'; budget: number; currency: 'ARS' | 'USD'; spotSeconds: number; playsTarget: number; notes: string }
export interface Evidence extends Base { screenId: string; campaignId: string; capturedAt: string; source: 'manual' | 'camera' | 'player'; status: 'pending' | 'verified' | 'rejected'; fileUrl: string; notes: string; plays: number; sha256: string }
export interface Incident extends Base { screenId: string; title: string; priority: 'low' | 'medium' | 'high' | 'critical'; status: 'open' | 'in_progress' | 'resolved'; assignee: string; dueDate: string; notes: string }
export interface Opportunity extends Base { name: string; city: string; address: string; stage: 'idea' | 'survey' | 'permits' | 'installation' | 'live'; owner: string; investment: number; monthlyRevenue: number; monthlyCost: number; currency: 'ARS' | 'USD'; notes: string }
export interface Quote extends Base { name: string; clientId: string; screenIds: string[]; startDate: string; endDate: string; baseAmount: number; adjustmentPercent: number; agencyPercent: number; serviceAmount: number; taxPercent: number; currency: 'ARS' | 'USD'; status: 'draft' | 'sent' | 'accepted' | 'declined'; notes: string }
export interface Entities { screens: Screen; clients: Client; operators: Operator; campaigns: Campaign; evidence: Evidence; incidents: Incident; opportunities: Opportunity; quotes: Quote }
export type WorkspaceData = { [K in Kind]: Entities[K][] };
export interface User { id: string; name: string; email: string; role: Role }
export interface Audit { id: string; actor: string; action: string; kind: string; entityId: string; at: string }
export interface IntegrationStatus { database: boolean; storage: boolean; ai: boolean; telemetry: boolean; latinAd: boolean }
export interface Bootstrap { data: WorkspaceData; user: User | null; integrations: IntegrationStatus; audit: Audit[] }
export const emptyData = (): WorkspaceData => ({screens:[],clients:[],operators:[],campaigns:[],evidence:[],incidents:[],opportunities:[],quotes:[]});
