import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useApp } from '../context/AppContext';
import { HomeScreen } from '../screens/HomeScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AnswerScreen } from '../screens/AnswerScreen';
import { OnboardingFlow } from '../screens/Onboarding/OnboardingFlow';
import { FirstMasteryCelebration } from '../components/FirstMasteryCelebration';
import { requestReviewManually } from '../lib/review';
import { COLORS, FONT_SIZE } from '../constants/colors';

type TabParamList = {
  Home: undefined;
  Review: undefined;
  Achievements: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          height: 88,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: FONT_SIZE.xs, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Review"
        component={ReviewScreen}
        options={{
          tabBarLabel: '復習',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔁" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarLabel: '実績',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '設定',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const {
    profile,
    loading,
    answerWordId,
    dismissAnswer,
    firstMasteryCelebration,
    closeFirstMasteryCelebration,
  } = useApp();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!profile.onboarding_completed) {
    return <OnboardingFlow />;
  }

  return (
    <>
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
      {answerWordId && (
        <AnswerScreen wordId={answerWordId} onDone={dismissAnswer} />
      )}
      <FirstMasteryCelebration
        visible={firstMasteryCelebration}
        onContinue={() => {
          // Close the celebration, then show the App Store review dialog.
          closeFirstMasteryCelebration();
          requestReviewManually().catch(() => {});
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});
