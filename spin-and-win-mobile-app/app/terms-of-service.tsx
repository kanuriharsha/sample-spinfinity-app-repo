import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <ThemedView style={[styles.container, { backgroundColor: '#000' }]}>
      <LinearGradient
        colors={['#0B1220', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <IconSymbol name="arrow.left" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <ThemedText style={styles.appTitle}>Terms & Conditions</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.headerSubtitle}>PEH Spinfinity Analytics</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        

        {/* Section 1 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>1.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>About PEH Spinfinity</ThemedText>
            <ThemedText style={styles.paragraph}>
              PEH Spinfinity Analytics is a business tool created by PEH Network Hub to help restaurants and other businesses run digital spin-wheel offers and track customer participation.
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              By signing in or using this service, you agree to these terms.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 2 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>2.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Who can use our app</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Only verified business owners or staff authorized by that business.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• You must be at least 18 years old.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• You're responsible for all actions taken under your account.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 3 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>3.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>What you can and can't do</ThemedText>
            
            <ThemedText style={styles.subheading}>✅ You can use our app to:</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Create offers, collect customer details, and view analytics.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Use customer data only for your business promotion or loyalty tracking.</ThemedText>
            
            <ThemedText style={[styles.subheading, { marginTop: 12 }]}>❌ You can't:</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Sell, share, or misuse your customers' data.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Try to hack, copy, or reverse-engineer the app.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Use the app for illegal or misleading promotions.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 4 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>4.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Data collected through your business</ThemedText>
            <ThemedText style={styles.paragraph}>
              When your customers fill out their details (like name, phone number, email), that information belongs to you (the business owner).
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              However, you give us permission to store and process it securely so we can show you reports and analytics.
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              You must tell your customers that their data will be used only for promotional and analytics purposes.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 5 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>5.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Our responsibility</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We store all client and customer data safely on secure servers.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We never sell or misuse data.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• If any technical problem or data issue happens, we'll fix it as soon as possible.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We can temporarily suspend access if someone breaks these rules or uses fake data.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 6 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>6.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Your responsibility</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Use the collected customer data only for your business promotions.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Do not share or upload anyone's data without their consent.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Keep your login password safe.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Follow local privacy laws (like India's Digital Personal Data Protection Act 2023).</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 7 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>7.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Subscription & Payment</ThemedText>
            <ThemedText style={styles.bulletPoint}>• If you're on a paid plan, you agree to pay the monthly or yearly fees on time.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Late or missing payments may pause your account.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Plans can be upgraded, downgraded, or canceled by contacting us.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 8 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>8.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>End of service or account deletion</ThemedText>
            <ThemedText style={styles.bulletPoint}>• You can stop using the app anytime.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• When your account is closed, your data will be deleted from our system within 30 days (except backups kept for security or legal reasons).</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 9 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>9.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Limitation of liability</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We always aim for smooth performance, but sometimes errors may happen.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We are not responsible for business losses, profit loss, or indirect damages due to internet or server issues.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 10 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>10.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Changes to these terms</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We may update these terms when new features or laws apply.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We'll inform you through the app or email before changes take effect.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 11 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>11.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Legal jurisdiction</ThemedText>
            <ThemedText style={styles.bulletPoint}>• These terms follow the laws of India.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Any dispute will be handled in the courts of Andhra Pradesh, India.</ThemedText>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  headerGradient: { 
    paddingTop: Platform.OS === 'ios' ? 48 : 28, 
    paddingBottom: 14 
  },
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 6, 
    marginTop: 10, 
    marginBottom: -20 
  },
  headerInfo: { 
    marginBottom: 12 
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-start',
    position: 'relative',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 44,
  },
  appTitle: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.95)', 
    marginTop: 2, 
    textAlign: 'center' 
  },
  
  content: {
    padding: 20,
    paddingTop: 24,
  },
  
  headerSection: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFB300',
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFB300',
    textAlign: 'center',
    lineHeight: 28,
  },
  
  section: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  sectionNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFB300',
    marginRight: 12,
    marginTop: 2,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 24,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    marginTop: 4,
  },
  paragraph: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 6,
  },
  
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
});
