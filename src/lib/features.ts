// Feature Flag Configuration System
// Controls rollout of GoFrugal integration features

export interface FeatureFlags {
  // API Integration Features
  gofrugalSync: boolean
  gofrugalValidation: boolean
  gofrugalAutoSync: boolean
  
  // UI Features
  varianceBadges: boolean
  syncStatusPage: boolean
  reconciliationUI: boolean
  itemsSync: boolean
  customerSync: boolean
  loyaltySync: boolean
  
  // Rollout Control
  enabledStores: string[]
  rolloutPercentage: number
}

// Default feature configuration (all disabled by default for safety)
const defaultFeatures: FeatureFlags = {
  gofrugalSync: false,
  gofrugalValidation: false,
  gofrugalAutoSync: false,
  varianceBadges: false,
  syncStatusPage: false,
  reconciliationUI: false,
  itemsSync: false,
  customerSync: false,
  loyaltySync: false,
  enabledStores: [],
  rolloutPercentage: 0
}

// Feature flag service
export class FeatureService {
  private features: FeatureFlags
  
  constructor() {
    this.features = this.loadFeatures()
  }
  
  private loadFeatures(): FeatureFlags {
    // Server-side check to prevent accessing process.env on client
    const isServer = typeof window === 'undefined'
    
    // Load from environment variables
    const envFeatures: Partial<FeatureFlags> = {
      gofrugalSync: process.env.NEXT_PUBLIC_ENABLE_GOFRUGAL === 'true',
      gofrugalValidation: process.env.NEXT_PUBLIC_ENABLE_GOFRUGAL === 'true',
      gofrugalAutoSync: isServer && process.env.ENABLE_AUTO_SYNC === 'true',
      varianceBadges: process.env.NEXT_PUBLIC_ENABLE_VARIANCE_BADGES === 'true',
      syncStatusPage: process.env.NEXT_PUBLIC_ENABLE_SYNC_UI === 'true',
      reconciliationUI: process.env.NEXT_PUBLIC_ENABLE_SYNC_UI === 'true',
      itemsSync: process.env.NEXT_PUBLIC_ENABLE_ITEMS_SYNC === 'true',
      customerSync: process.env.NEXT_PUBLIC_ENABLE_CUSTOMER_SYNC === 'true',
      loyaltySync: process.env.NEXT_PUBLIC_ENABLE_LOYALTY === 'true',
      enabledStores: isServer ? (process.env.ENABLED_STORES?.split(',').filter(s => s.trim()) || []) : [],
      rolloutPercentage: isServer ? parseInt(process.env.ROLLOUT_PERCENTAGE || '0') : 0
    }
    
    return { ...defaultFeatures, ...envFeatures }
  }
  
  public isEnabled(feature: keyof FeatureFlags, storeId?: string): boolean {
    // Type guard for boolean features
    const featureValue = this.features[feature]
    
    // For array and number features, always return true if they exist
    if (feature === 'enabledStores' || feature === 'rolloutPercentage') {
      return true
    }
    
    // Check if feature is enabled globally
    if (!featureValue) return false
    
    // Check store-specific enablement for sync features
    if (storeId && (feature === 'gofrugalSync' || feature === 'gofrugalValidation')) {
      // Check explicit store list first
      if (this.features.enabledStores.length > 0) {
        return this.features.enabledStores.includes(storeId)
      }
      
      // Check rollout percentage
      if (this.features.rolloutPercentage > 0 && this.features.rolloutPercentage < 100) {
        const hash = this.hashString(storeId)
        const bucket = hash % 100
        return bucket < this.features.rolloutPercentage
      }
    }
    
    return true
  }
  
  public async updateFeature(feature: keyof FeatureFlags, value: any): Promise<void> {
    // Update feature flag (admin only)
    // This would typically require authentication and authorization checks
    if (!this.isAdmin()) {
      throw new Error('Unauthorized: Only admins can update feature flags')
    }
    
    ;(this.features as any)[feature] = value
    
    // Persist to database (optional)
    await this.persistFeatures()
  }
  
  public getFeatures(): FeatureFlags {
    return { ...this.features }
  }
  
  public getEnabledStores(): string[] {
    return [...this.features.enabledStores]
  }
  
  public getRolloutPercentage(): number {
    return this.features.rolloutPercentage
  }
  
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
  
  private isAdmin(): boolean {
    // TODO: Implement proper admin check
    // This should check the current user's role
    return true
  }
  
  private async persistFeatures(): Promise<void> {
    // Store in database for persistence
    // This could be implemented using Supabase
    // For now, we rely on environment variables
    console.log('Feature flags updated:', this.features)
  }
  
  // Check if any GoFrugal feature is enabled
  public isGoFrugalEnabled(): boolean {
    return this.features.gofrugalSync || 
           this.features.gofrugalValidation || 
           this.features.gofrugalAutoSync
  }
  
  // Check if store is in rollout
  public isStoreInRollout(storeId: string): boolean {
    // Explicit store list takes precedence
    if (this.features.enabledStores.length > 0) {
      return this.features.enabledStores.includes(storeId)
    }
    
    // Check percentage rollout
    if (this.features.rolloutPercentage > 0) {
      const hash = this.hashString(storeId)
      const bucket = hash % 100
      return bucket < this.features.rolloutPercentage
    }
    
    // If no specific rollout config, check if GoFrugal is enabled globally
    return this.features.gofrugalSync
  }
}

// Export singleton instance
export const featureService = new FeatureService()

// React hook for feature flags
export function useFeature(feature: keyof FeatureFlags, storeId?: string): boolean {
  // This hook can be enhanced with React state management if needed
  return featureService.isEnabled(feature, storeId)
}

// Helper function to check multiple features at once
export function areFeaturesEnabled(features: (keyof FeatureFlags)[], storeId?: string): boolean {
  return features.every(feature => featureService.isEnabled(feature, storeId))
}

// Helper function to get all enabled features
export function getEnabledFeatures(storeId?: string): (keyof FeatureFlags)[] {
  const allFeatures: (keyof FeatureFlags)[] = [
    'gofrugalSync',
    'gofrugalValidation',
    'gofrugalAutoSync',
    'varianceBadges',
    'syncStatusPage',
    'reconciliationUI',
    'itemsSync',
    'customerSync',
    'loyaltySync'
  ]
  
  return allFeatures.filter(feature => featureService.isEnabled(feature, storeId))
}