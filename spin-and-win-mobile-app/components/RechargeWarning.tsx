import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';

// Only show warning based on anniversary calculation
function getRechargeWarning(onboard: string | Date | undefined): string | null {
  if (!onboard) return null;
  const onboardDate = new Date(onboard);
  const now = new Date();
  const day = onboardDate.getDate();
  const month = onboardDate.getMonth();
  const year = now.getFullYear();

  // Next anniversary this year
  let anniversary = new Date(year, month, day);

  // If anniversary already passed, use next year
  if (
    anniversary < now ||
    (anniversary.getDate() === now.getDate() &&
      anniversary.getMonth() === now.getMonth() &&
      anniversary.getFullYear() === now.getFullYear())
  ) {
    anniversary = new Date(year + 1, month, day);
  }

  const diffTime = anniversary.getTime() - now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 4 && diffDays > 0) {
    return `Only ${diffDays} day${diffDays === 1 ? '' : 's'} left, please recharge to continue.`;
  }
  if (diffDays === 0) {
    return 'Today is your recharge day! Please recharge to continue.';
  }
  return null;
}

// Remove recharge prop except for button usage
export default function RechargeWarning({ onboard }: { onboard?: string | Date }) {
  const warning = getRechargeWarning(onboard);
  if (!warning) return null;
  return (
    <View style={styles.warningBox}>
      <ThemedText style={styles.warningText}>{warning}</ThemedText>
      {/* You can add a button here and use recharge if needed */}
      {/* <Button title="Recharge" onPress={...} /> */}
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
