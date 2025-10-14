import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function PrivacyPolicy() {
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
                <ThemedText style={styles.appTitle}>Privacy Policy</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.headerSubtitle}>PEH Spinfinity Analytics</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        

        {/* Section 1 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>1.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Why we collect data</ThemedText>
            <ThemedText style={styles.paragraph}>
              We collect and process information to:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• Help your business track customer spins and rewards.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Improve app features and security.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Understand app usage for analytics only.</ThemedText>
            <ThemedText style={[styles.paragraph, { marginTop: 12, fontWeight: '700' }]}>
              We never sell your data or your customers' data.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 2 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>2.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>What information we collect</ThemedText>
            
            <ThemedText style={styles.subheading}>From you (business owner):</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Business name, contact number, email, and login info.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Payment or subscription details (only through trusted gateways).</ThemedText>
            
            <ThemedText style={[styles.subheading, { marginTop: 12 }]}>From your customers (through your spin wheel):</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Name, phone number, email, and spin results.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Time of participation and optional spending details.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 3 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>3.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>How we use this data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• To show you reports and analytics.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• To send reward updates or promotional messages (if consented).</ThemedText>
            <ThemedText style={styles.bulletPoint}>• To improve our system's accuracy and security.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• To comply with legal or tax requirements if needed.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 4 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>4.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Data security</ThemedText>
            <ThemedText style={styles.bulletPoint}>• All data is stored on secure servers with restricted access.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We use encryption, passwords, and regular monitoring.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Only authorized staff can view limited data for maintenance purposes.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 5 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>5.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Data sharing</ThemedText>
            <ThemedText style={styles.paragraph}>
              We may share limited data only when:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• Required by law or government order.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Needed with trusted service partners (like hosting providers) under confidentiality.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• You request integration with another service (e.g., WhatsApp API).</ThemedText>
            <ThemedText style={[styles.paragraph, { marginTop: 12, fontWeight: '700' }]}>
              We never sell or rent data to anyone.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 6 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>6.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>How long we keep your data</ThemedText>
            <ThemedText style={styles.bulletPoint}>• We keep your and your customers' data only as long as your account is active.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• After deletion, data is wiped from active systems and backups within 30–60 days.</ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 7 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>7.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Customer rights</ThemedText>
            <ThemedText style={styles.paragraph}>
              If your customer asks, you must:
            </ThemedText>
            <ThemedText style={styles.bulletPoint}>• Show what data you collected about them.</ThemedText>
            <ThemedText style={styles.bulletPoint}>• Correct or delete their information if requested.</ThemedText>
            <ThemedText style={[styles.paragraph, { marginTop: 12 }]}>
              We'll assist you if any customer raises a data request through us.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 8 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>8.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Children's privacy</ThemedText>
            <ThemedText style={styles.paragraph}>
              The app is not meant for minors below 18.
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              If we find such data, it will be deleted immediately.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 9 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>9.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Updates to privacy policy</ThemedText>
            <ThemedText style={styles.paragraph}>
              We may update this policy for new features or legal reasons.
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              Updated versions will always be available inside the app.
            </ThemedText>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Section 10 - Contact */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionNumber}>10.</ThemedText>
          <View style={styles.sectionContent}>
            <ThemedText style={styles.sectionTitle}>Contact us</ThemedText>
            <ThemedText style={styles.paragraph}>
              For questions or data requests:
            </ThemedText>
            <View style={styles.contactCard}>
              <ThemedText style={styles.contactItem}>📩 contactpehnetworkhub@gmail.com</ThemedText>
              <ThemedText style={styles.contactItem}>🏢 PEH Network Hub</ThemedText>
              <ThemedText style={styles.contactItem}>📍 Andhra Pradesh, India</ThemedText>
            </View>
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
    borderColor: '#4ECDC4',
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4ECDC4',
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
    color: '#4ECDC4',
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
  
  contactCard: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.3)',
  },
  contactItem: {
    fontSize: 15,
    color: '#4ECDC4',
    lineHeight: 24,
    fontWeight: '600',
  },
});
