import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { AppCard } from './AppCard';
import { ReportIssueButton } from '@/components/feedback/ReportIssueButton';
import { useFeedback } from '@/hooks/useFeedback';
import { useAppTheme } from '@/theme';

export type FeedbackScopeProp = {
  componentKey: string;
  componentTitle?: string;
  tags?: string[];
};

export interface InformationalCardProps {
  children: React.ReactNode;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  style?: any;
  contentContainerStyle?: any;
  feedbackScope?: FeedbackScopeProp;
}

/**
 * InformationalCard - Flat card for displaying information
 * No elevation, uses theme surface/background
 * Optional left-aligned icon
 */
export function InformationalCard({
  children,
  icon,
  iconColor,
  style,
  contentContainerStyle,
  feedbackScope,
}: InformationalCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { enabled, openReporter } = useFeedback();

  return (
    <View style={styles.cardWrapper}>
      {feedbackScope && enabled && (
        <View style={styles.feedbackButton}>
          <ReportIssueButton
            onPress={() =>
              openReporter({
                scopeType: 'card',
                componentKey: feedbackScope.componentKey,
                componentTitle: feedbackScope.componentTitle,
                tags: feedbackScope.tags,
              })
            }
            accessibilityLabel={`Report issue: ${feedbackScope.componentTitle ?? feedbackScope.componentKey}`}
            size={14}
          />
        </View>
      )}
    <AppCard
      mode="flat"
      borderRadius="lg"
      style={[
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          elevation: 0,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          {
            padding: appTheme.spacing.lg,
          },
          contentContainerStyle,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={iconColor || theme.colors.onSurfaceVariant}
            style={[styles.icon, { opacity: 0.7 }]}
          />
        )}
        <View style={styles.childrenContainer}>{children}</View>
      </View>
    </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
  },
  feedbackButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  childrenContainer: {
    flex: 1,
  },
});

