import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

function getRechargeWarning(onboard: string | Date | undefined): string | null {
  if (!onboard) return null;
  const onboardDate = new Date(onboard);
  const now = new Date();
  const day = onboardDate.getDate();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Next anniversary this month
  const anniversary = new Date(year, month, day);
  // If anniversary already passed, use next month
  if (anniversary < now) anniversary.setMonth(month + 1);
  const diffDays = Math.ceil((anniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 4 && diffDays > 0) {
    return `Only ${diffDays} day${diffDays === 1 ? '' : 's'} left, please recharge to continue.`;
  }
  if (diffDays === 0) {
    return 'Today is your recharge day! Please recharge to continue.';
  }
  return null;
}

export default function RechargeWarning({ onboard }: { onboard?: string | Date }) {
  const warning = getRechargeWarning(onboard);
  if (!warning) return null;
  return (
    <View style={styles.warningBox}>
      <ThemedText style={styles.warningText}>{warning}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    backgroundColor: '#FFB300',
    padding: 10,
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
  },
  warningText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
