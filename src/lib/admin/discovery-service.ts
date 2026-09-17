/**
 * Discovery Service
 * Manages client discovery sessions and analysis
 */

import { DiscoverySession, DiscoveryAnalytics, TalentRequirement, DiscoveryTemplate, DISCOVERY_TEMPLATES } from './discovery-types';

export class DiscoveryService {
  private static readonly STORAGE_KEY = 'fm_discovery_sessions';
  private static readonly SHEET_NAME = 'Discovery_Sessions';

  // ===== DISCOVERY SESSION MANAGEMENT =====

  static async createDiscoverySession(clientId: string | null, template?: DiscoveryTemplate, leadId?: string): Promise<DiscoverySession> {
    const sessionId = `discovery-${Date.now()}`;
    const templateConfig = template ? DISCOVERY_TEMPLATES[template] : DISCOVERY_TEMPLATES.custom;

    const newSession: DiscoverySession = {
      id: sessionId,
      clientId: clientId || `anonymous-${Date.now()}`,
      leadId,
      status: 'draft',
      currentSection: 1,
      completedSections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedTo: 'current-user', // Get from auth context
      
      // Initialize empty discovery data
      companyFundamentals: {
        companyName: '',
        industry: '',
        companySize: 'medium',
        headquarters: '',
        businessModel: '',
        uniqueSellingProposition: '',
        keyStakeholders: []
      },
      projectOverview: {
        projectName: '',
        projectType: 'website',
        projectDescription: '',
        keyObjectives: [],
        timeline: {
          startDate: '',
          desiredLaunch: '',
          flexibility: 'flexible'
        },
        projectScope: [],
        successMetrics: [],
        constraints: []
      },
      targetAudience: {
        primaryAudience: {
          demographics: {
            ageRange: '',
            gender: '',
            income: '',
            education: '',
            occupation: ''
          },
          platforms: [],
          contentPreferences: []
        },
        customerPersonas: [],
        geographicTarget: [],
        psychographics: [],
        behaviorPatterns: [],
        painPoints: [],
        customerJourney: []
      },
      currentState: {
        socialMediaPresence: [],
        existingBranding: {
          hasLogo: false,
          hasBrandGuidelines: false,
          brandAssets: [],
          brandPerception: ''
        },
        currentMarketing: [],
        currentChallenges: [],
        whatIsWorking: [],
        whatIsNotWorking: []
      },
      goalsKPIs: {
        businessGoals: [],
        marketingGoals: [],
        kpis: [],
        successDefinition: '',
        timeframe: '',
        priorityLevel: 'medium'
      },
      competitionMarket: {
        directCompetitors: [],
        indirectCompetitors: [],
        marketPosition: '',
        differentiators: [],
        competitiveAdvantages: [],
        marketSize: '',
        marketTrends: [],
        threatAssessment: [],
        opportunities: []
      },
      budgetResources: {
        totalBudget: {
          amount: 0,
          currency: 'INR',
          flexibility: 'flexible'
        },
        budgetBreakdown: [],
        paymentTerms: '',
        internalResources: [],
        roiExpectations: '',
        budgetApprovalProcess: ''
      },
      technicalRequirements: {
        platformPreferences: [],
        integrations: [],
        securityRequirements: [],
        performanceRequirements: [],
        accessibilityRequirements: [],
        deviceSupport: [],
        browserSupport: [],
        futureScalability: []
      },
      contentCreative: {
        brandPersonality: [],
        toneOfVoice: {
          primary: '',
          characteristics: [],
          avoidList: [],
          examples: []
        },
        visualStyle: {
          colorPreferences: [],
          fontPreferences: [],
          imageStyle: [],
          designInspiration: []
        },
        contentStrategy: {
          contentTypes: [],
          postingFrequency: '',
          contentThemes: [],
          seasonalContent: false,
          userGeneratedContent: false,
          contentWorkflow: ''
        },
        existingAssets: [],
        contentGaps: [],
        creativePreferences: []
      },
      nextSteps: {
        immediateActions: [],
        decisionMakers: [],
        approvalProcess: '',
        timeline: {
          phases: [],
          milestones: [],
          dependencies: []
        },
        communication: {
          frequency: '',
          channels: [],
          reportingFormat: '',
          meetingSchedule: '',
          pointOfContact: ''
        },
        riskFactors: [],
        successFactors: [],
        followUpDate: ''
      }
    };

    try {
      // Save to Google Sheets
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          session: newSession
        })
      });

      const result = await response.json();
      if (result.success) {
        // Also save to localStorage for offline access
        this.saveToLocalStorage(newSession);
        return newSession;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error creating discovery session:', error);
      // Fallback to localStorage only
      this.saveToLocalStorage(newSession);
      return newSession;
    }
  }

  static async getDiscoverySession(sessionId: string): Promise<DiscoverySession | null> {
    try {
      const response = await fetch(`/api/discovery?sessionId=${sessionId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.error('Error fetching discovery session:', error);
    }

    // Fallback to localStorage
    return this.getFromLocalStorage(sessionId);
  }

  static async updateDiscoverySession(sessionId: string, updates: Partial<DiscoverySession>): Promise<boolean> {
    try {
      updates.updatedAt = new Date().toISOString();

      const response = await fetch('/api/discovery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          sessionId,
          updates
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update localStorage
        const session = await this.getDiscoverySession(sessionId);
        if (session) {
          const updatedSession = { ...session, ...updates };
          this.saveToLocalStorage(updatedSession);
        }
        return true;
      }
    } catch (error) {
      console.error('Error updating discovery session:', error);
    }

    // Fallback to localStorage
    const session = this.getFromLocalStorage(sessionId);
    if (session) {
      const updatedSession = { ...session, ...updates };
      this.saveToLocalStorage(updatedSession);
      return true;
    }

    return false;
  }

  static async getClientDiscoverySessions(clientId: string): Promise<DiscoverySession[]> {
    try {
      const response = await fetch(`/api/discovery?clientId=${clientId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.error('Error fetching client discovery sessions:', error);
    }

    // Fallback to localStorage
    const sessions = this.getAllFromLocalStorage();
    return sessions.filter(session => session.clientId === clientId);
  }

  // ===== DISCOVERY ANALYTICS =====

  static generateDiscoveryAnalytics(session: DiscoverySession): DiscoveryAnalytics {
    const completionRate = (session.completedSections.length / 10) * 100;
    const talentRequirements = this.analyzeTalentRequirements(session);
    const projectComplexity = this.assessProjectComplexity(session);
    const estimatedBudget = session.budgetResources.totalBudget.amount;
    const skillsRequired = this.extractRequiredSkills(session);

    return {
      sessionId: session.id,
      completionRate,
      timeSpent: this.calculateTimeSpent(session),
      talentRequirements,
      projectComplexity,
      estimatedBudget,
      recommendedTeamSize: this.calculateTeamSize(talentRequirements),
      skillsRequired,
      timelineAssessment: this.assessTimeline(session)
    };
  }

  private static analyzeTalentRequirements(session: DiscoverySession): TalentRequirement[] {
    const requirements: TalentRequirement[] = [];
    
    // Analyze project type and technical requirements
    const { projectType } = session.projectOverview;
    const { platformPreferences, integrations } = session.technicalRequirements;
    const { contentStrategy } = session.contentCreative;

    // Base requirements by project type
    switch (projectType) {
      case 'website':
        requirements.push({
          role: 'Web Developer',
          skillsRequired: ['HTML/CSS', 'JavaScript', 'Responsive Design'],
          experienceLevel: 'mid',
          hoursRequired: 80,
          priority: 'must_have'
        });
        break;
      
      case 'app':
        requirements.push({
          role: 'Mobile Developer',
          skillsRequired: ['React Native', 'iOS/Android', 'API Integration'],
          experienceLevel: 'senior',
          hoursRequired: 120,
          priority: 'must_have'
        });
        break;
      
      case 'marketing_campaign':
        requirements.push({
          role: 'Digital Marketing Specialist',
          skillsRequired: ['Social Media', 'Content Strategy', 'Campaign Management'],
          experienceLevel: 'mid',
          hoursRequired: 60,
          priority: 'must_have'
        });
        break;
    }

    // Add design requirements
    if (session.contentCreative.visualStyle.designInspiration.length > 0) {
      requirements.push({
        role: 'UI/UX Designer',
        skillsRequired: ['Figma', 'User Experience', 'Visual Design'],
        experienceLevel: 'mid',
        hoursRequired: 40,
        priority: 'must_have'
      });
    }

    // Add content requirements
    if (contentStrategy.contentTypes.length > 0) {
      requirements.push({
        role: 'Content Creator',
        skillsRequired: ['Copywriting', 'Content Strategy', 'SEO'],
        experienceLevel: 'mid',
        hoursRequired: 30,
        priority: 'nice_to_have'
      });
    }

    return requirements;
  }

  private static assessProjectComplexity(session: DiscoverySession): 'low' | 'medium' | 'high' | 'very_high' {
    let complexityScore = 0;

    // Project scope complexity
    complexityScore += session.projectOverview.projectScope.length * 2;
    
    // Technical integrations
    complexityScore += session.technicalRequirements.integrations.length * 3;
    
    // Performance requirements
    complexityScore += session.technicalRequirements.performanceRequirements.length * 2;
    
    // Content complexity
    complexityScore += session.contentCreative.contentStrategy.contentTypes.length * 1;

    if (complexityScore <= 10) return 'low';
    if (complexityScore <= 20) return 'medium';
    if (complexityScore <= 35) return 'high';
    return 'very_high';
  }

  private static extractRequiredSkills(session: DiscoverySession): string[] {
    const skills = new Set<string>();
    
    // Extract from platform preferences
    session.technicalRequirements.platformPreferences.forEach(platform => {
      skills.add(platform);
    });
    
    // Extract from integrations
    session.technicalRequirements.integrations.forEach(integration => {
      skills.add(integration.system);
    });
    
    // Extract from content strategy
    session.contentCreative.contentStrategy.contentTypes.forEach(type => {
      skills.add(type);
    });

    return Array.from(skills);
  }

  private static calculateTeamSize(requirements: TalentRequirement[]): number {
    return Math.max(2, Math.min(8, requirements.length));
  }

  private static assessTimeline(session: DiscoverySession): string {
    const { timeline } = session.projectOverview;
    const startDate = new Date(timeline.startDate);
    const launchDate = new Date(timeline.desiredLaunch);
    const daysDiff = Math.ceil((launchDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

    if (daysDiff < 30) return 'Very Tight - Additional resources recommended';
    if (daysDiff < 60) return 'Tight - Well-planned execution needed';
    if (daysDiff < 120) return 'Reasonable - Good timeline for quality delivery';
    return 'Comfortable - Ample time for iterative improvement';
  }

  private static calculateTimeSpent(session: DiscoverySession): number {
    const created = new Date(session.createdAt);
    const updated = new Date(session.updatedAt);
    return Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60)); // minutes
  }

  // ===== LOCAL STORAGE HELPERS =====

  private static saveToLocalStorage(session: DiscoverySession): void {
    try {
      const sessions = this.getAllFromLocalStorage();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex !== -1) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private static getFromLocalStorage(sessionId: string): DiscoverySession | null {
    try {
      const sessions = this.getAllFromLocalStorage();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  private static getAllFromLocalStorage(): DiscoverySession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  // ===== REPORT GENERATION =====

  static generateDiscoveryReport(session: DiscoverySession): string {
    const analytics = this.generateDiscoveryAnalytics(session);
    
    return `
# Discovery Report - ${session.companyFundamentals.companyName}

## Executive Summary
**Project:** ${session.projectOverview.projectName}
**Type:** ${session.projectOverview.projectType}
**Completion:** ${analytics.completionRate.toFixed(1)}%
**Complexity:** ${analytics.projectComplexity}
**Estimated Budget:** ₹${analytics.estimatedBudget.toLocaleString('en-IN')}

## Project Overview
${session.projectOverview.projectDescription}

### Key Objectives
${session.projectOverview.keyObjectives.map(obj => `- ${obj}`).join('\n')}

## Talent Requirements
### Recommended Team (${analytics.recommendedTeamSize} members)
${analytics.talentRequirements.map(req => 
  `- **${req.role}** (${req.experienceLevel}): ${req.skillsRequired.join(', ')} - ${req.hoursRequired}h`
).join('\n')}

### Required Skills
${analytics.skillsRequired.map(skill => `- ${skill}`).join('\n')}

## Budget Breakdown
**Total Budget:** ₹${session.budgetResources.totalBudget.amount.toLocaleString('en-IN')}
**Flexibility:** ${session.budgetResources.totalBudget.flexibility}

${session.budgetResources.budgetBreakdown.map(budget => 
  `- ${budget.category}: ₹${budget.allocation.toLocaleString('en-IN')} (${budget.priority} priority)`
).join('\n')}

## Timeline Assessment
${analytics.timelineAssessment}

**Target Launch:** ${session.projectOverview.timeline.desiredLaunch}
**Timeline Flexibility:** ${session.projectOverview.timeline.flexibility}

## Next Steps
${session.nextSteps.immediateActions.map(action => 
  `- ${action.task} (${action.owner}) - Due: ${action.dueDate}`
).join('\n')}

---
*Generated by Freaking Minds Discovery System*
*Report Date: ${new Date().toLocaleDateString()}*
    `.trim();
  }
}