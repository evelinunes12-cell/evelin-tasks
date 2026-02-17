import { 
  Zap, Flame, Rocket, Shield, Mountain, Brain, Sword, Diamond, Crown,
  type LucideProps 
} from "lucide-react";

const iconMap: Record<string, React.FC<LucideProps>> = {
  Zap, Flame, Rocket, Shield, Mountain, Brain, Sword, Diamond, Crown,
};

interface AchievementIconProps extends LucideProps {
  name: string;
}

export const AchievementIcon = ({ name, ...props }: AchievementIconProps) => {
  const Icon = iconMap[name] || Flame;
  return <Icon {...props} />;
};
