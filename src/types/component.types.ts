// Component-specific types

export interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
}

export interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  benefits: string[];
}

export interface SafetyFeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface StepCardProps {
  step: {
    number: number;
    title: string;
    description: string;
    points: string[];
  };
}

