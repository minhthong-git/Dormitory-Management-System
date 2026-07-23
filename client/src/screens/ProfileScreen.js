import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCinema } from '../context/CinemaContext';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function ProfileScreen({ navigation }) {
  const { currentUser, state, logout } = useCinema();

  // Calculate stats
  const customerBookings = state.bookings.filter(
    b => b.customerId === currentUser?.id
  );
  const totalBookings = customerBookings.length;
  const activeBooking = customerBookings.find(b => b.status === 'active');
  const bookingHistoryCount = customerBookings.filter(b => b.status !== 'active').length;

  let activeBookingDetails = null;
  if (activeBooking) {
    const schedule = state.schedules.find(s => s.id === activeBooking.scheduleId);
    if (schedule) {
      const movie = state.movies.find(m => m.id === schedule.movieId);
      activeBookingDetails = {
        movieTitle: movie?.title || 'Unknown Movie',
        date: schedule.date,
        time: schedule.startTime,
        room: schedule.room,
      };
    }
  }

  const handleLogout = () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to exit your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header bar */}
      <LinearGradient colors={['#6366F1', '#3B82F6']} style={styles.headerGradient}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={['#8B5CF6', '#3B82F6']} style={styles.avatarGradient}>
              <Text style={styles.avatarText}>
                {currentUser?.fullName ? currentUser.fullName.charAt(0) : 'U'}
              </Text>
            </LinearGradient>
            <View style={styles.statusDot} />
          </View>

          <Text style={styles.fullName}>{currentUser?.fullName || 'Valued Customer'}</Text>
          <Text style={styles.username}>@{currentUser?.username || 'customer'}</Text>
          
          <View style={styles.roleBadge}>
            <Ionicons name="person" size={12} color={COLORS.primary} />
            <Text style={styles.roleBadgeText}>
              {currentUser?.role?.toUpperCase() || 'CUSTOMER'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Statistics Block */}
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statVal, { color: activeBooking ? COLORS.success : COLORS.textDim }]}>
              {activeBooking ? '1' : '0'}
            </Text>
            <Text style={styles.statLabel}>Active Ticket</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{bookingHistoryCount}</Text>
            <Text style={styles.statLabel}>Past Bookings</Text>
          </View>
        </View>

        {/* Current Active Ticket Info */}
        <Text style={styles.sectionTitle}>Active Reservation</Text>
        {activeBookingDetails ? (
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={styles.ticketTag}>
                <Ionicons name="ticket" size={14} color={COLORS.secondary} />
                <Text style={styles.ticketTagText}>ACTIVE TICKET</Text>
              </View>
              <View style={styles.statusIndicator}>
                <View style={styles.dot} />
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
            </View>
            
            <Text style={styles.ticketMovieTitle} numberOfLines={1}>
              {activeBookingDetails.movieTitle}
            </Text>

            <View style={styles.ticketDetailsGrid}>
              <View style={styles.ticketDetailCol}>
                <Text style={styles.ticketLabel}>SCREEN DATE</Text>
                <Text style={styles.ticketValue}>{activeBookingDetails.date}</Text>
              </View>
              <View style={styles.ticketDetailCol}>
                <Text style={styles.ticketLabel}>START TIME</Text>
                <Text style={styles.ticketValue}>{activeBookingDetails.time}</Text>
              </View>
              <View style={styles.ticketDetailCol}>
                <Text style={styles.ticketLabel}>ROOM</Text>
                <Text style={styles.ticketValue}>{activeBookingDetails.room}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.manageBookingBtn}
              onPress={() => {
                navigation.goBack();
                navigation.navigate('MyBookings');
              }}
            >
              <Text style={styles.manageBookingText}>Manage Booking Details</Text>
              <Ionicons name="chevron-forward" size={14} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noTicketCard}>
            <Ionicons name="ticket-outline" size={24} color={COLORS.textDim} />
            <Text style={styles.noTicketText}>You do not have any active bookings.</Text>
          </View>
        )}

        {/* Personal details box */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <View style={styles.detailsBox}>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>Email Address</Text>
            </View>
            <Text style={styles.infoValue}>{currentUser?.username}@cinematix.com</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>Phone Number</Text>
            </View>
            <Text style={styles.infoValue}>+1 (555) 304-9218</Text>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoLabel}>Account Status</Text>
            </View>
            <Text style={[styles.infoValue, { color: COLORS.success }]}>Active / Verified</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => Alert.alert('Edit Profile', 'Profile modification UI is currently read-only.')}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.editBtnText}>Edit Profile Info</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.logoutBtnText}>Log Out Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: 10,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
    borderBottomLeftRadius: BORDER_RADIUS.xlarge,
    borderBottomRightRadius: BORDER_RADIUS.xlarge,
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileHeaderCard: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  fullName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  username: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.small,
    marginTop: SPACING.md,
    gap: 4,
    ...SHADOWS.small,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.lg,
    ...SHADOWS.small,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  statsDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    height: '60%',
    alignSelf: 'center',
  },
  ticketCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ticketTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.small,
    gap: 4,
  },
  ticketTagText: {
    color: COLORS.cardPurpleText,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.small,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  statusText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketMovieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: SPACING.xs,
  },
  ticketDetailsGrid: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    paddingBottom: SPACING.md,
  },
  ticketDetailCol: {
    flex: 1,
  },
  ticketLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.textDim,
    letterSpacing: 0.5,
  },
  ticketValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  manageBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
  },
  manageBookingText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  noTicketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  noTicketText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  detailsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  actionsContainer: {
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 12,
    gap: SPACING.xs,
  },
  editBtnText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 12,
    gap: SPACING.xs,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
